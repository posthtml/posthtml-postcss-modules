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

		tree.match(match('link[module][href]'), function (link) {
			promises.push(new Promise(function (resolve, reject) {
				return fs.readFile(path.resolve(options.context, link.attrs.href), 'utf8', function (err, res) {
					return err ? reject(err) : resolve(res);
				});
			}).then(function (content) {
				return postcss(options.plugins).process(content);
			}).then(function (processed) {
				// Find corresponding elements and replace their classes
				Object.keys(processed.root.tokens).forEach(function (key) {
					tree.match(match('[classname=' + key + ']'), function (node) {
						delete node.attrs.classname;
						node.attrs.class = node.attrs.class ? node.attrs.class + ' ' + processed.root.tokens[key] : processed.root.tokens[key];
						return node;
					});
				});

				// Delete links properties
				delete link.attrs.href;
				delete link.attrs.module;

				// Replace link with style tag
				link.tag = 'style';
				link.content = processed.css;
			}));

			return link;
		});

		return Promise.all(promises).then(function () {
			return tree;
		});
	};
};
