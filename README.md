# Posthtml-postcss-modules <img align="right" width="220" height="200" title="PostHTML logo" src="http://posthtml.github.io/posthtml/logo.svg">

[![NPM version](http://img.shields.io/npm/v/posthtml-postcss-modules.svg)](https://www.npmjs.org/package/posthtml-postcss-modules)
[![Travis Build Status](https://travis-ci.org/canvaskisa/posthtml-postcss-modules.svg)](https://travis-ci.org/canvaskisa/posthtml-postcss-modules)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)

## Installation
```console
$ npm i --save posthtml-postcss-modules
```

## Usage
```html
<!-- header.html -->
<link href="header.css" module/>

<header classname="root">
  <nav classname="navigation">
  </nav>
</header>
```

```css
/* header.css */
.root {background-color: white;}
.navigation {height: 100px;}
```

```js
/* index.js */
var fs = require('fs');
var posthtml = require('posthtml');

posthtml()
  .use(require('posthtml-postcss-modules')({
    generateScopedName: '[hash:base64:5]'
  }))
  .process(fs.readFileSync('header.html', 'utf8'))
  .then(function(result) {
    return result; 

    /**
     * <style>
     *   .wqroe {background-color: white;}
     *   ._32Lja {color: red;}
     * </style>
     *
     * <header class="wqroe">
     *   <nav class="_32Lja">
     *   </nav>
     * </header>
     */
  });
```

## Api
```js
options = {
  context: './', // root path for links lookup
  plugins: [], // postcss plugins to apply for every link
  generateScopedName: genericNames // function to process css names or string
};
```

## Related
[CSS Modules](https://github.com/css-modules/css-modules)

## License
MIT © [Aleksandr Yakunichev](https://github.com/canvaskisa)
