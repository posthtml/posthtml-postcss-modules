import fs from 'fs';
import path from 'path';
import test from 'ava';
import posthtml from 'posthtml';
import plugin from '..';

const filecontents = fs.readFileSync(path.resolve(__dirname, './test.spec.css'), 'utf8');

test('Must include css', async t => {
	const actual = `<div><link href="./test.spec.css" module/></div>`;
	const expected = `<div><style>${filecontents}</style></div>`;

	const {html} = await posthtml().use(plugin({
		generateScopedName: '[local]'
	})).process(actual);

	t.is(html, expected);
});

test('Must replace html classes with processed ones', async t => {
	const actual = `<link href="./test.spec.css" module/><div classname="root"></div>`;
	const expected = `<style>${filecontents}</style><div class="root"></div>`;

	const {html} = await posthtml().use(plugin({
		generateScopedName: '[local]'
	})).process(actual);

	t.is(html, expected);
});

test('Must keep previous classes on html elements', async t => {
	const actual = `<link href="./test.spec.css" module/><div classname="root" class="div-class"></div>`;
	const expected = `<style>${filecontents}</style><div class="div-class root"></div>`;

	const {html} = await posthtml().use(plugin({
		generateScopedName: '[local]'
	})).process(actual);

	t.is(html, expected);
});

test('Must fail when module\'s href cannot be found', async t => {
	const source = `<div><link href="./undefined.css" module/></div>`;
	t.throws(posthtml().use(plugin()).process(source));
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
