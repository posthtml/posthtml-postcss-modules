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
 * retieves content of node element
 * or reads file from href attribute of <link module>
 * @param  {Object} node
 * @return {Promise<String>} contents of file or <style> tag
 */
function getContentFromNode(options, node) {
	return new Promise(function (resolve, reject) {
		if (node.tag === 'link') {
			return fs.readFile(normalizePath(node.attrs.href, options.root, options.from), 'utf8', function (err, res) {
				return err ? reject(err) : resolve(res);
			});
		}

		return resolve(node.content);
	});
}

/**
 * [normalizePath description]
 * @param  {String} href  [path to the file]
 * @param  {String} _root [context]
 * @param  {String} _from [relative file]
 * @return {String}       [absolute path to file]
 */
function normalizePath(href, _root, _from) {
	return path.join(path.isAbsolute(href) ? _root : path.dirname(_from), href);
}

/**
 * processes css with css-modules plugins
 * @param  {Object} options [plugin's options]
 * @return {Function}
 */
function processContentWithPostCSS(options, href) {
	/**
	 * @param  {String} content [css to process]
	 * @return {Object}         [object with css tokens and css itself]
	 */
	return function (content) {
		if (options.generateScopedName) {
			options.generateScopedName = typeof options.generateScopedName === 'function' ?
				options.generateScopedName :
				genericNames(options.generateScopedName, {context: options.root});
		} else {
			options.generateScopedName = function (local, filename) {
				return Scope.generateScopedName(local, path.relative(options.root, filename));
			};
		}

		function fetch(_to, _from) {
			// Seems ok 👏
			var filePath = normalizePath(_to, options.root, _from);

			return new Promise(function (resolve, reject) {
				return fs.readFile(filePath, 'utf8', function (err, content) {
					/* istanbul ignore next: just error handler */
					if (err) {
						return reject(err);
					}

					return runner.process(content, {from: filePath})
						.then(function (result) {
							return resolve(result.root.tokens);
						}).catch(reject);
				});
			});
		}

		// Setup css-modules plugins 💼
		var runner = postcss([
			Values,
			LocalByDefault,
			ExtractImports,
			new Scope({generateScopedName: options.generateScopedName}),
			new Parser({fetch: fetch})
		].concat(options.plugins));

		return runner.process(content, {from: normalizePath(href, options.root, options.from)});
	};
}

module.exports = function plugin(options) {
	options = options || {};
	options.root = path.resolve(options.root || './');
	options.plugins = options.plugins || [];
	options.from = options.from || '';

	return function parse(tree) {
		var promises = [];

		tree.match(match('link[module][href]'), function (node) {
			promises.push(getContentFromNode(options, node)
				.then(processContentWithPostCSS(options, node.attrs && node.attrs.href))
				.then(function (processed) {
					/**
					 * Replacing all classname attributes in html,
					 * with classes from css
					 */
					Object.keys(processed.root.tokens).forEach(function (key) {
						tree.match({attrs: {classname: new RegExp('(?:^|\\s)' + key + '(?:\\s|$)')}}, function (node) {
							node.attrs.class = node.attrs.class ? node.attrs.class + ' ' + processed.root.tokens[key] : processed.root.tokens[key];
							return node;
						});
					});

					// Remove classname attribute from everything
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
