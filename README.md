# Seadragon Ajax v2

Seadragon Ajax (‘Seajax’) v2 is a JavaScript library for using deep zoom content
(DZI and DZC files, as supported by Silverlight) in web pages, and for easily
creating beautiful zooming interfaces. It introduces the `Seadragon2.Image`
element and the accompanying `<sdimg>` tag, which mimics the `<img>` tag but
references a deep zoom image or a particular element from a deep zoom
collection. Seajax smoothly blends different resolution levels, and works in
virtually every major browser. It automatically prioritizes network requests for
image tiles that cover more area or are closer to the center of the screen.
Seajax also provides a `Viewer`, which allows for fluid mouse-controlled panning
and zooming of HTML or SVG content. Furthermore, the `Viewer` can be used to
manipulate the coordinate space of a canvas element, or to control multiple
kinds of content simultaneously (such as a `canvas` element with an HTML
overlay).

This repository also contains code for creating a control that mimics the
`PivotViewer` found in Silverlight, where a user can filter and sort a deep zoom
collection. Collection data can come from a CXML file or be added dynamically on
the client. For more info on setting up a page using this `PivotViewer`
implementation, see [`PivotViewer` Quickstart][pivot-viewer-quickstart].
Unlike the library portion, which aims to support every major browser,
`PivotViewer` requires a browser with the `<canvas>` element, meaning IE8 and
earlier are unsupported. A demo collection can be seen at
<http://seajax.github.io/>.

As a historical note, most of this code was written in 2010 and was targeted at
mouse interaction, so updates may be needed for newer browsers and touch
interaction.


# Setup

- 	**Windows:** To build all outputs, run
	[`Build/Scripts/seajax_v2.py`](./Build/Scripts/seajax_v2.py) using Python 2
	or 3.

- 	**Mac OS X:** To build all outputs, run:

	```bash
	make
	```

The build script is currently set up to call `ajaxmin` for its minification
step, but that could easily be swapped for another minifier if you prefer.
After building, the `bin/v2` directory will contain various files containing
different subsets of the Seajax functionality. The most complete feature set
(and therefore the biggest JavaScript file) is the `pivot` file. The `zoom` file
has just the features needed for creating a pan & zoom container; the `image`
file has features for loading and displaying DZC and DZI content, and the
`zoomimage` file contains both. `utils` and `ajax` are more minimal builds
containing various helper functions. You should only ever need one of these
JavaScript files (no need to include both `utils` and `pivot` on your page,
because the `pivot` build contains everything from `utils`, for example).
No external libraries are needed.


# Usage

## Pivot

See the instructions in [`PivotViewer` Quickstart][pivot-viewer-quickstart].

## Image

Add an `<sdimg>` element in your markup, or create it in code with one of the
following:

```javascript
var img = new Seadragon2.Image();
var img = document.createElement('sdimg');
```

Set its `src` property like you would with a normal `<img>`, but point it at
deep zoom data:

```javascript
img.src = 'someimage.dzi';
img.src = 'somecollection.dzc#5'; // note the hash indicates which item from the collection
```

## Viewer

Make any element pan & zoom the content that it contains by creating a `Viewer`:

```javascript
var viewer = new Seadragon2.Viewer(document.getElementById('myViewerDiv'), {
    viewportOptions: {
        maxZoom: 10,
        minZoom: 0.4,
        visibilityRatio: 0.5
    }
});
```

See the code comments in
[`./v2/src/zoomcontainer/Viewer.js`](./v2/src/zoomcontainer/Viewer.js) for
descriptions of all available `viewportOptions`, and to reference other methods
that can be called on the `Viewer` object once it’s constructed.



[pivot-viewer-quickstart]: ./v2/app/pivot/quickstart.html
