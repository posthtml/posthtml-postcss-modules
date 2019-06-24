'use strict';

const fs = require('fs');
const path = require('path');
const match = require('posthtml-match-helper');
const genericNames = require('generic-names');

const postcss = require('postcss');
const Values = require('postcss-modules-values');
const LocalByDefault = require('postcss-modules-local-by-default');
const ExtractImports = require('postcss-modules-extract-imports');
const Scope = require('postcss-modules-scope');
const Parser = require('postcss-modules-parser');

/**
 * Retieves content of node element
 * or reads file from href attribute of <link module>
 * @param  {Object} node
 * @return {Promise<String>} contents of file or <style> tag
 */
function getContentFromNode(options, node) {
	return new Promise((resolve, reject) => {
		if (node.tag === 'link') {
			return fs.readFile(normalizePath(node.attrs.href, options.root, options.from), 'utf8', (err, res) => {
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
	/* istanbul ignore next */
	return href ? path.join(path.isAbsolute(href) ? _root : path.dirname(_from), href) : _from;
}

/**
 * Processes css with css-modules plugins
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
				/* istanbul ignore next */
				options.generateScopedName :
				genericNames(options.generateScopedName, {context: options.root});
		} else {
			options.generateScopedName = function (local, filename) {
				return Scope.generateScopedName(local, path.relative(options.root, filename));
			};
		}

		// Setup css-modules plugins 💼
		const runner = postcss([
			Values,
			LocalByDefault,
			ExtractImports,
			new Scope({generateScopedName: options.generateScopedName}),
			new Parser({fetch})
		].concat(options.plugins));

		function fetch(_to, _from) {
			// Seems ok 👏
			const filePath = normalizePath(_to, options.root, _from);

			return new Promise((resolve, reject) => {
				return fs.readFile(filePath, 'utf8', (err, content) => {
					/* istanbul ignore next: just error handler */
					if (err) {
						return reject(err);
					}

					return runner.process(content, {from: filePath})
						.then(result => {
							return resolve(result.root.tokens);
						}).catch(reject);
				});
			});
		}

		return runner.process(content, {from: normalizePath(href, options.root, options.from)});
	};
}

module.exports = function (options) {
	options = options || {};
	options.root = path.resolve(options.root || './');
	options.plugins = options.plugins || [];
	options.from = options.from || '';

	return function (tree) {
		const promises = [];

		tree.match(match('link[module][href], style[module]'), node => {
			promises.push(getContentFromNode(options, node)
				.then(processContentWithPostCSS(options, node.attrs && node.attrs.href))
				.then(processed => {
					/**
					 * Replacing all classname attributes in html,
					 * with classes from css
					 */
					Object.keys(processed.root.tokens).forEach(key => {
						tree.match({attrs: {classname: new RegExp('(?:^|\\s)' + key + '(?:\\s|$)')}}, node => {
							node.attrs.class = node.attrs.class ? node.attrs.class + ' ' + processed.root.tokens[key] : processed.root.tokens[key];
							return node;
						});
					});

					// Remove classname attribute from everything
					tree.match(match('[classname]'), node => {
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

		/* istanbul ignore next */
		return promises.length ? Promise.all(promises).then(() => {
			return tree;
		}) : tree;
	};
};
