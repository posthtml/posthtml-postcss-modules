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
	/* istanbul ignore next */
	return href ? path.join(path.isAbsolute(href) ? _root : path.dirname(_from), href) : _from;
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
				/* istanbul ignore next */
				options.generateScopedName :
				genericNames(options.generateScopedName, {context: options.root});
		} else {
			options.generateScopedName = function (local, filename) {
				return Scope.generateScopedName(local, path.relative(options.root, filename));
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

		return runner.process(content, {from: normalizePath(href, options.root, options.from)});
	};
}

/**
 * returns object with default settings
 * @param  {Object} options [plugin's options]
 * @return {Object}
 */
function getDefaultOptions(options) {
	options = Object.assign({
		plugins: [],
		from: '',
		selectors: {
			link: 'link[module][href]',
			style: 'style[module]'
		},
		attributes: {
			class: 'classname'
		}
	}, options);
	options.root = path.resolve(options.root || process.cwd());
	return options;
}

/**
 * returns object with default settings
 * @param  {Object} node [node that will be processed]
 * @param  {String} oldClassName [the class name that will be removed]
 * @param  {String} newClassName [the class name that will be added]
 * @return {Object}      [processed node]
 */
function addProcessedClassName(node, oldClassName, newClassName) {
	if (node.attrs.class) {
		node.attrs.class = node.attrs.class.split(' ').filter(currentClassName => currentClassName !== oldClassName);
		node.attrs.class.push(newClassName);
		node.attrs.class = node.attrs.class.join(' ');
	} else {
		node.attrs.class = newClassName;
	}
	return node;
}

module.exports = options => {
	options = getDefaultOptions(options);

	return tree => {
		var promises = [];
		tree.match(match(`${options.selectors.link}, ${options.selectors.style}`), node => {
			promises.push(getContentFromNode(options, node)
				.then(processContentWithPostCSS(options, node.attrs && node.attrs.href))
				.then(processed => {
					/**
					 * Replacing all classname attributes in html,
					 * with classes from css
					 */
					Object.keys(processed.root.tokens).forEach(key => {
						var regexp = new RegExp('(?:^|\\s)' + key + '(?:\\s|$)');
						var attrs = {};
						attrs[options.attributes.class] = regexp;
						var matcher = {attrs: attrs};
						tree.match(matcher, node => {
							return addProcessedClassName(node, key, processed.root.tokens[key]);
						});
					});

					// Remove custom class attribute from everything if exists
					if (options.attributes.class !== 'class') {
						tree.match(match(`[${options.attributes.class}]`), node => {
							delete node.attrs.classname;
							return node;
						});
					}

					/**
					 * Remove href and module attributes
					 * and replace tag with <style>
					 * and content with parsed css, hooray! 🙌
					 */
					if (node.attrs) {
						delete node.attrs.href;
						delete node.attrs.module;
					}
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
