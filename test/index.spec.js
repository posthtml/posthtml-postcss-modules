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
	const actual = `<div><link href="./undefined.css" module/></div>`;
	t.throws(posthtml().use(plugin()).process(actual));
});
