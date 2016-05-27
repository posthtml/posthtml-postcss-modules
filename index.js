'use strict';

var fs = require('fs');
var path = require('path');
var match = require('posthtml-match-helper');
var genericNames = require('generic-names');

var postcss = require('postcss');
var Values = require('postcss-modules-values');
var LocalByDefault = require('postcss-modules-local-by-default');
var ExtractImports = require('postcss-modules-extract-imports');
var Scope = require('postcss-modules-scope');
var Parser = require('postcss-modules-parser');

/**
 * @todo
 * 1. new Parser({fetch})
 * 2. clean up a little
 */
function getPostcssPlugins(generateScopedName) {
	return [
		Values,
		LocalByDefault,
		ExtractImports,
		new Scope({generateScopedName: generateScopedName}),
		Parser
	];
}

module.exports = function plugin(options) {
	options = options || {};
	options.context = options.context || './';

	/* istanbul ignore next: do we really need to test this? */
	if (options.generateScopedName) {
		options.generateScopedName = typeof options.generateScopedName === 'function' ?
			options.generateScopedName :
			genericNames(options.generateScopedName, {context: options.context});
	} else {
		/* istanbul ignore next: do we really need to test this? */
		options.generateScopedName = function (local, filename) {
			return Scope.generateScopedName(local, path.resolve(options.context, filename));
		};
	}

	options.plugins = (options.plugins || []).concat(getPostcssPlugins(options.generateScopedName));

	return function parse(tree) {
		var promises = [];

		tree.match(match('link[module][href], style[module]'), function (module) {
			promises.push(new Promise(function (resolve, reject) {
				return module.tag === 'link' ? fs.readFile(path.resolve(options.context, module.attrs.href), 'utf8', function (err, res) {
					return err ? reject(err) : resolve(res);
				}) : resolve(module.content);
			}).then(function (content) {
				return postcss(options.plugins).process(content);
			}).then(function (processed) {
				// Find corresponding elements and replace their classes
				Object.keys(processed.root.tokens).forEach(function (key) {
					tree.match(match('[classname*=' + key + ']'), function (node) {
						node.attrs.class = node.attrs.class ? node.attrs.class + ' ' + processed.root.tokens[key] : processed.root.tokens[key];
						return node;
					});
				});

				// Remove all classname props
				tree.match(match('[classname]'), function (node) {
					delete node.attrs.classname;
					return node;
				});

				// Delete module properties
				delete module.attrs.href;
				delete module.attrs.module;

				// Replace module with style tag
				module.tag = 'style';
				module.content = processed.css;
			}));

			return module;
		});

		return Promise.all(promises).then(function () {
			return tree;
		});
	};
};
