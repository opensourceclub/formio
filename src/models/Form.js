'use strict';

const _ = require('lodash');
const debug = require('debug')('formio:models:form');

module.exports = (formio) => {
  const hook = require('../util/hook')(formio);
  const util = formio.util;
  /* eslint-disable no-useless-escape */
  const invalidRegex = /[^0-9a-zA-Z\-\/_]|^\-|\-$|^\/|\/$/;
  const validKeyRegex = /^(\w|\w[\w-.]*\w)$/;
  const validShortcutRegex = /^([A-Z]|Enter|Esc)$/i;
  /* eslint-enable no-useless-escape */
  const componentKeys = (components) => {
    const keys = [];
    util.eachComponent(components, (component) => {
      if (!_.isUndefined(component.key) && !_.isNull(component.key)) {
        keys.push(component.key);
      }
    }, true);
    return _(keys);
  };

  const componentPaths = (components) => {
    const paths = [];
    util.eachComponent(components, (component, path) => {
      if (component.input && !_.isUndefined(component.key) && !_.isNull(component.key)) {
        paths.push(path);
      }
    }, true);
    return _(paths);
  };

  const componentShortcuts = (components) => {
    const shortcuts = [];
    util.eachComponent(components, (component, path) => {
      if (component.shortcut) {
        shortcuts.push(_.capitalize(component.shortcut));
      }
      if (component.values) {
        _.forEach(component.values, (value) => {
          const shortcut = _.get(value, 'shortcut');
          if (shortcut) {
            shortcuts.push(_.capitalize(shortcut));
          }
        });
      }
    }, true);
    return _(shortcuts);
  };

  const uniqueMessage = `只能包含字母、数字、连字符和正斜杠，但不能以连字符或正斜杠开始或结束`;
  const uniqueValidator = (property) => function(value, done) {
    const query = {deleted: {$eq: null}};
    query[property] = value;
    const search = hook.alter('formSearch', query, this, value);

    // Ignore the id if this is an update.
    if (this._id) {
      search._id = {$ne: this._id};
    }

    formio.mongoose.model('form').findOne(search).exec((err, result) => {
      if (err) {
        debug(err);
        return done(false);
      }
      if (result) {
        return done(false);
      }

      done(true);
    });
  };

  const keyError = `此表单上的组件具有无效或丢失的API KEY。KEY必须只包含字母数字字符或连字符，并且必须以字母开头。请检查每个组件的API属性名`;

  const shortcutError = `此表单上的组件有无效的快捷方式。快捷方式必须只包含字母字符或必须等于'Enter'或'Esc'`;

  const model = require('./BaseModel')({
    schema: new formio.mongoose.Schema({
      title: {
        type: String,
        description: '表单的标题',
        required: true
      },
      name: {
        type: String,
        description: '此表单的名称',
        required: true,
        validate: [
          {
            message: `名称 ${uniqueMessage}`,
            validator: (value) => !invalidRegex.test(value)
          },
          {
            isAsync: true,
            message: '每个项目的名称必须是惟一的',
            validator: uniqueValidator('name')
          }
        ]
      },
      path: {
        type: String,
        description: '资源的路径',
        index: true,
        required: true,
        lowercase: true,
        trim: true,
        validate: [
          {
            message: `路径 ${uniqueMessage}`,
            validator: (value) => !invalidRegex.test(value)
          },
          {
            message: '路径不能以`submission` 或 `action` 结尾',
            validator: (path) => !path.match(/(submission|action)\/?$/)
          },
          {
            isAsync: true,
            message: '每个项目的路径必须是惟一的',
            validator: uniqueValidator('path')
          }
        ]
      },
      type: {
        type: String,
        enum: ['form', 'resource'],
        required: true,
        default: 'form',
        description: '表单类型',
        index: true
      },
      display: {
        type: String,
        description: '表单的展现方式'
      },
      action: {
        type: String,
        description: '提交数据的自定义操作URL'
      },
      tags: {
        type: [String],
        index: true
      },
      deleted: {
        type: Number,
        default: null
      },
      access: [formio.schemas.PermissionSchema],
      submissionAccess: [formio.schemas.PermissionSchema],
      owner: {
        type: formio.mongoose.Schema.Types.Mixed,
        ref: 'submission',
        index: true,
        default: null,
        set: owner => {
          // Attempt to convert to objectId.
          return formio.util.ObjectId(owner);
        },
        get: owner => {
          return owner ? owner.toString() : owner;
        }
      },
      components: {
        type: [formio.mongoose.Schema.Types.Mixed],
        description: '表单中的组件数组',
        validate: [
          {
            message: keyError,
            validator: (components) => componentKeys(components).every((key) => key.match(validKeyRegex))
          },
          {
            message: shortcutError,
            validator: (components) => componentShortcuts(components)
              .every((shortcut) => shortcut.match(validShortcutRegex))
          },
          {
            isAsync: true,
            validator: (components, valid) => {
              const paths = componentPaths(components);
              const msg = '组件的KEY必须唯一';
              const uniq = paths.uniq();
              const diff = paths.filter((value, index, collection) => _.includes(collection, value, index + 1));

              if (_.isEqual(paths.value(), uniq.value())) {
                return valid(true);
              }

              return valid(false, (msg + diff.value().join(', ')));
            }
          },
          {
            isAsync: true,
            validator: (components, valid) => {
              const shortcuts = componentShortcuts(components);
              const msg = '组件的快照必须唯一';
              const uniq = shortcuts.uniq();
              const diff = shortcuts.filter((value, index, collection) => _.includes(collection, value, index + 1));

              if (_.isEqual(shortcuts.value(), uniq.value())) {
                return valid(true);
              }

              return valid(false, (msg + diff.value().join(', ')));
            }
          }
        ]
      },
      settings: {
        type: formio.mongoose.Schema.Types.Mixed,
        description: '自定义表单设置'
      },
      properties: {
        type: formio.mongoose.Schema.Types.Mixed,
        description: '自定义表单属性'
      }
    })
  });

  // Add a partial index for deleted forms.
  model.schema.index({
    deleted: 1
  }, {
    partialFilterExpression: {deleted: {$eq: null}}
  });

  // Add machineName to the schema.
  model.schema.plugin(require('../plugins/machineName')('form', formio));

  // Set the default machine name.
  model.schema.machineName = (document, done) => {
    hook.alter('formMachineName', document.name, document, done);
  };

  return model;
};
