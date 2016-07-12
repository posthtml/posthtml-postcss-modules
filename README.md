[![NPM][npm]][npm-url]
[![Deps][deps]][deps-url]
[![Tests][travis]][travis-url]
[![Coverage][cover]][cover-url]
[![XO Code Style][style]][style-url]

<div align="center">
  <a href="https://github.com/posthtml/posthtml">
    <img width="180" height="180" src="http://posthtml.github.io/posthtml/logo.svg">
  </a>
  <img width="108" height="108" title="PostCSS"                 src="http://postcss.github.io/postcss/logo.svg" hspace="20">
  <img width="150" height="150"  src="https://raw.githubusercontent.com/css-modules/logos/master/css-modules-logo.png" />
  <h1>PostCSS Modules Plugin</h1>
  <p>A plugin to modules resources with ease<p>
</div>

<h2 align="center">Install</h2>

```bash
npm i -D posthtml-postcss-modules
```

<h2 align="center">Usage</h2>

```js
options = {
  root: './', // root path for links lookup
  from: '' // pathname to resolving file (it's always better to provide it)
  plugins: [], // postcss plugins to apply for every link
  generateScopedName: genericNames // function to process css names or string
};
```

### Related

[CSS Modules](https://github.com/css-modules/css-modules)

<h2 align="center">Example</h2>

```html
<!-- header.html -->
<link href="header.css" module/>

<style module>
  .navigation {height: 100px;}
</style>

<header classname="root">
  <nav classname="root navigation">
  </nav>
</header>
```

```css
/* header.css */
.root {background-color: white;}
```

```js
const { readFileSync } = require('fs')
const posthtml = require('posthtml')

posthtml()
  .use(require('posthtml-postcss-modules')({
    generateScopedName: '[hash:base64:5]'
  }))
  .process(readFileSync('header.html', 'utf8'))
  .then((result) => result)
  })
```

```html
 <style>.wqroe {background-color: white;}</style>
 <style>._32Lja {height: 100px;}</style>

 <header class="wqroe">
    <nav class="wqroe _32Lja"></nav>
 </header>
```

<h2 align="center">LICENSE</h2>

MIT License (MIT)

Copyright (c) 2016 PostHTML [Aleksandr Yakunichev](https://github.com/canvaskisa)

> Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

> The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

[npm]: https://img.shields.io/npm/v/posthtml-modules.svg
[npm-url]: https://npmjs.com/package/posthtml-modules

[deps]: https://david-dm.org/posthtml/posthtml-modules.svg
[deps-url]: https://david-dm.org/posthtml/posthtml-modules

[style]: https://img.shields.io/badge/code_style-XO-5ed9c7.svg
[style-url]: https://github.com/sindresorhus/xo

[travis]: http://img.shields.io/travis/posthtml/posthtml-modules.svg
[travis-url]: https://travis-ci.org/posthtml/posthtml-modules

[cover]: https://coveralls.io/repos/github/posthtml/posthtml-modules/badge.svg?branch=master
[cover-url]: https://coveralls.io/github/posthtml/posthtml-modules?branch=master
