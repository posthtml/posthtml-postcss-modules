import fs from 'fs';
import path from 'path';
import test from 'ava';
import posthtml from 'posthtml';
import plugin from '..';

console.log(path.resolve(__dirname, './test.spec.css'));

const filecontents = fs.readFileSync(path.resolve(__dirname, './test.spec.css'), 'utf8');

test('Must include css', async t => {
	const actual = '<div><link href="./test/test.spec.css" module/></div>';
	const expected = `<div><style>${filecontents}</style></div>`;

	const {html} = await posthtml().use(plugin({
		generateScopedName: '[local]'
	})).process(actual);

	t.is(html, expected);
});

test('Must replace html classes with processed ones', async t => {
	const actual = '<link href="./test/test.spec.css" module/><div classname="root"></div>';
	const expected = `<style>${filecontents}</style><div class="root"></div>`;

	const {html} = await posthtml().use(plugin({
		generateScopedName: '[local]'
	})).process(actual);

	t.is(html, expected);
});

test('Must keep previous classes on html elements', async t => {
	const actual = '<link href="./test/test.spec.css" module/><div classname="root" class="div-class"></div>';
	const expected = `<style>${filecontents}</style><div class="div-class root"></div>`;

	const {html} = await posthtml().use(plugin({
		generateScopedName: '[local]'
	})).process(actual);

	t.is(html, expected);
});

test('Must fail when module\'s href cannot be found', async t => {
	const source = '<div><link href="./undefined.css" module/></div>';
	const error = await t.throwsAsync(posthtml().use(plugin()).process(source));
	t.is(error.message, 'ENOENT: no such file or directory, open \'undefined.css\'');
});

test('Must process <style module/> contents', async t => {
	const source = '<style module>.a {color: black} .b {color: white}</style><div classname="a b"></div>';
	const expected = '<style>.a-test {color: black} .b-test {color: white}</style><div class="a-test b-test"></div>';
	const {html} = await posthtml().use(plugin({generateScopedName: '[local]-test'})).process(source);
	t.is(html, expected);
});

test('Must match classes properly', async t => {
	const source = '<style module>.a {color: black} .ab {color: white}</style><div classname="ab"></div>';
	const expected = '<style>.a-test {color: black} .ab-test {color: white}</style><div class="ab-test"></div>';
	const {html} = await posthtml().use(plugin({generateScopedName: '[local]-test'})).process(source);
	t.is(html, expected);
});

test('Must be able to compose styles', async t => {
	const source = '<style module>.c {width: 50px;} .b {height: 100px;} .a {color: black; composes: b c;}</style><div classname="a"></div>';
	const expected = '<style>.c-test {width: 50px;} .b-test {height: 100px;} .a-test {color: black;}</style><div class="a-test b-test c-test"></div>';
	const {html} = await posthtml().use(plugin({generateScopedName: '[local]-test'})).process(source);
	t.is(html, expected);
});

test('Must be able to compose styles from file', async t => {
	const source = '<style module>.compose {color: black; composes: compositor from "./compose.spec.css"}</style><div classname="compose"></div>';
	const expected = '<style>.compose-test {color: black}</style><div class="compose-test compositor-test"></div>';
	const {html} = await posthtml().use(plugin({from: __filename, generateScopedName: '[local]-test'})).process(source);
	t.is(html, expected);
});

test('Must generate default classnames if generateScopedName is undefined', async t => {
	const actual = '<style module>.root {color: red;}</style><div classname="root"></div>';
	const expected = '<style>._test_index_spec__root {color: red;}</style><div class="_test_index_spec__root"></div>';
	const {html} = await posthtml().use(plugin({from: __filename})).process(actual);
	t.is(html.replace(/(\n|\t)/g, ''), expected);
});
