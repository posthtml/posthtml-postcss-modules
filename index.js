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
 * ⚒ @todo
 * 1. Fix generateScopeName path resolving
 * 2. Fix fetch path resolving (compose: className from '../mixins.css')
 */

/**
 * retieves content of node element
 * or reads file from href attribute of <link module>
 * @param  {Object} node
 * @return {Promise<String>} contents of file or <style> tag
 */
function getContentFromNode(options, node) {
	return new Promise(function (resolve, reject) {
		if (node.tag === 'link') {
			// Path resolving seems ok here 👍
			var filePath = path.join(path.isAbsolute(node.attrs.href) ? options.root : path.dirname(options.from), node.attrs.href);
			return fs.readFile(filePath, 'utf8', function (err, res) {
				return err ? reject(err) : resolve(res);
			});
		}

		return resolve(node.content);
	});
}

/**
 * processes css with css-modules plugins
 * @param  {Object} options [plugin's options]
 * @return {Function}
 */
function processContentWithPostCSS(options, node) {
	/**
	 * @param  {String} content [css to process]
	 * @return {Object}         [object with css tokens and css itself]
	 */
	return function (content) {
		if (options.generateScopedName) {
			options.generateScopedName = typeof options.generateScopedName === 'function' ?
				options.generateScopedName :
				genericNames(options.generateScopedName, {context: options.from || options.root});
		} else {
			options.generateScopedName = function (local, filename) {
				// @todo
				// 😭 Wondering how to fix name resolving...
				var filePath = path.join(path.dirname(options.from), path.basename(node.attrs.href || filename)).replace(options.root, '');
				return Scope.generateScopedName(local, filePath);
			};
		}

		// Setup css-modules plugins 💼
		var runner = postcss([
			Values,
			LocalByDefault,
			ExtractImports,
			new Scope({generateScopedName: options.generateScopedName}),
			new Parser({fetch: fetch})
		].concat(options.plugins));

		function fetch(to) {
			// @todo
			// 😭 Wondering how to fix name resolving...
			var filePath = path.join(path.isAbsolute(to) ? options.root : path.dirname(options.from), to);

			return new Promise(function (resolve, reject) {
				return fs.readFile(filePath, 'utf8', function (err, css) {
					/* istanbul ignore next: just error handler */
					if (err) {
						return reject(err);
					}

					return runner.process(css, {from: filePath})
						.then(function (result) {
							return resolve(result.root.tokens);
						}).catch(reject);
				});
			});
		}

		return runner.process(content);
	};
}

module.exports = function plugin(options) {
	options = options || {};
	options.root = path.resolve(options.root || './');
	options.plugins = options.plugins || [];
	options.from = options.from || '';

	return function parse(tree) {
		var promises = [];

		tree.match(match('link[module][href], style[module]'), function (node) {
			promises.push(getContentFromNode(options, node)
				.then(processContentWithPostCSS(options, node))
				.then(function (processed) {
					/**
					 * Replacing all classname attributes in html,
					 * which classes from css
					 */
					Object.keys(processed.root.tokens).forEach(function (key) {
						tree.match({attrs: {classname: new RegExp('(?:^|\\s)' + key + '(?:\\s|$)')}}, function (node) {
							node.attrs.class = node.attrs.class ? node.attrs.class + ' ' + processed.root.tokens[key] : processed.root.tokens[key];
							return node;
						});
					});

					// Remove classnames attribute from everything
					tree.match(match('[classname]'), function (node) {
						delete node.attrs.classname;
						return node;
					});

					/**
					 * Remove href and module attributes
					 * and replace tag with <style>
					 * and content with parsed css, hooray! 🙌
					 */
					delete node.attrs.href;
					delete node.attrs.module;
					node.tag = 'style';
					node.content = processed.css;
				})
			);

			return node;
		});

		return promises.length ? Promise.all(promises).then(function () {
			return tree;
		}) : tree;
	};
};
