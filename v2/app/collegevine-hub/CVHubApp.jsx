/*global Seadragon2, Pivot, PivotViewer, makeElement, addText*/

// PivotView.js:
// This file is responsible for initializing PivotViewer instances.
// It creates HTML elements for the UI surrounding the Viewer, handles
// user interaction with those elements, and also handles custom events
// that are raised by the Viewer.

/**
 * Set up and return a PivotViewer instance, created inside the given container element.
 * @method init
 * @param container {HTMLElement} The container element
 * @return {Pivot.PivotViewer}
 */
var Pivot_init = (Pivot.init = function(container) {
  // clear out the workspace we've been provided
  while (container.firstChild) {
    container.removeChild(container.firstChild)
  }

  // check whether the browser supports canvas
  if (!makeElement("canvas").getContext) {
    addText(
      container,
      "Your browser doesn’t support canvas! Get a more modern one."
    )
    return
  }

  // start by setting up some basics for our view
  var inputElmt = makeElement("input", "pivot_input", container)
  inputElmt.setAttribute("type", "checkbox") // make it a checkbox so it won't bring up onscreen keyboard
  var mainView = makeElement("div", "pivot pivot_viewbox", container)
  var canvasBox = makeElement("div", "pivot pivot_canvas", mainView)
  var mouseBox = makeElement("div", "pivot pivot_layer", canvasBox)
  var behindLayer = makeElement("div", "pivot pivot_layer", mouseBox)
  var canvas = makeElement("canvas", "pivot", mouseBox)
  canvas.height = canvas.offsetHeight
  canvas.width = canvas.offsetWidth
  var frontLayer = makeElement("div", "pivot pivot_layer", mouseBox)

  var railWidth = 0

  // The actual viewer object that will do zooming, panning, layout, and animation.
  var viewer = new PivotViewer(
    canvas,
    mouseBox,
    frontLayer,
    behindLayer,
    railWidth,
    railWidth,
    inputElmt
  )

  // any time the user interacts with the viewer, focus the offscreen text box so we can catch directional arrows
  container.addEventListener("click", function() {
    inputElmt.focus()
  })

  return viewer
})

Seadragon2.ImageManager.disable()
