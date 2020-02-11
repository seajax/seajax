/*global Seadragon2, Pivot, PivotCxmlLoader, PivotNumberPicker, PivotViewer, addEventListener,
PivotNumber_format, makeElement, addText, hasOwnProperty, PivotDatePicker, PivotSlider*/

// PivotView.js:
// This file is responsible for initializing PivotViewer instances.
// It creates HTML elements for the UI surrounding the Viewer, handles
// user interaction with those elements, and also handles custom events
// that are raised by the Viewer.

/**
 * Set up and return a PivotViewer instance, created inside the given container element.
 * This method is responsible for setting up the title bar, search options, filters pane,
 * and details pane for the control. Unless you're interested in setting those things up
 * yourself, you should call this method rather than the Pivot.PivotViewer constructor.
 * @method init
 * @param div {HTMLElement} The container element
 * @return {Pivot.PivotViewer}
 */
var Pivot_init = (Pivot.init = function(div, { initialView = "grid" } = {}) {
  let currentView = initialView || "grid"

  // clear out the workspace we've been provided
  while (div.firstChild) {
    div.removeChild(div.firstChild)
  }

  // check whether the browser supports canvas
  if (!makeElement("canvas").getContext) {
    addText(div, "Your browser doesn’t support canvas! Get a more modern one.")
    return
  }

  // start by setting up some basics for our view
  var inputElmt = makeElement("input", "pivot_input", div)
  inputElmt.setAttribute("type", "checkbox") // make it a checkbox so it won't bring up onscreen keyboard
  var mainView = makeElement("div", "pivot pivot_viewbox", div)
  var topBar = makeElement("div", "pivot pivot_topbar", mainView)
  var title = makeElement("div", "pivot pivot_title", topBar)
  var canvasBox = makeElement("div", "pivot pivot_canvas", mainView)
  var mouseBox = makeElement("div", "pivot pivot_layer", canvasBox)
  var behindLayer = makeElement("div", "pivot pivot_layer", mouseBox)
  var canvas = makeElement("canvas", "pivot", mouseBox)
  canvas.height = canvas.offsetHeight
  canvas.width = canvas.offsetWidth
  var frontLayer = makeElement("div", "pivot pivot_layer", mouseBox)

  // var railWidth = filterPane.offsetLeft + filterPane.offsetWidth
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

  // top bar
  var zoomSlider = makeElement(
    "div",
    "pivot pivot_sorttools pivot_zoomslider",
    topBar
  )
  zoomSlider = new PivotSlider(zoomSlider, 0, 100, 0, "Zoom Out", "Zoom In")
  var graphButton = makeElement(
    "div",
    "pivot_sorttools pivot_graph pivot_activesort",
    topBar
  )
  graphButton.title = "Graph View"
  var gridButton = makeElement(
    "div",
    "pivot_sorttools pivot_grid pivot_activesort",
    topBar
  )
  gridButton.title = "Grid View"

  // functions for making one view button look clickable and the other not
  function makeViewClickable(button) {
    button.classList.remove("pivot_activesort")
    button.classList.add("pivot_hoverable")
  }
  function makeViewSelected(button) {
    button.classList.add("pivot_activesort")
    button.classList.remove("pivot_hoverable")
  }

  function setView(value) {
    switch (value) {
      case "grid": {
        viewer.gridView()
        makeViewSelected(gridButton)
        makeViewClickable(graphButton)
        break
      }
      case "graph": {
        viewer.graphView()
        makeViewSelected(graphButton)
        makeViewClickable(gridButton)
        break
      }
      default:
        Seadragon2.Debug.warn(`setView: Invalid view: ${value}`)
        return
    }

    currentView = value
  }

  graphButton.onclick = () => setView("graph")
  gridButton.onclick = () => setView("grid")

  var sortBox = makeElement("select", "pivot pivot_sorttools", topBar)

  // re-sort the collection when the sort box changes
  sortBox.onchange = function() {
    viewer.sortBy(sortBox.value)
  }

  var sortLabel = makeElement("div", "pivot_sorttools pivot_subtle", topBar)
  addText(sortLabel, "Sort:")

  // functions for updating zoom slider from viewer and vice versa
  viewer.addListener("zoom", function(percent) {
    zoomSlider.setValue(percent)
  })
  zoomSlider.addListener("change", function(value) {
    viewer.zoomToPercent(value)
  })

  // if the viewer's title is set, we'll put it in the top bar
  viewer.addListener("titleChange", function(text) {
    title.innerHTML = ""
    addText(title, text)
  })

  // if the viewer sets the copyright info, put it in the details pane
  viewer.addListener("copyright", function(legalInfo) {
    legalStuff.innerHTML = ""
    var link = makeElement("a", undefined, legalStuff)
    link.href = legalInfo.href
    link.target = "_blank"
    addText(link, legalInfo.name)
  })

  // once we know about facets for the collection, we can build
  // the rest of the UI. note that this can be reset at any time,
  // if the current facets change. if the facets change, we expect
  // the viewer to have already dropped any filters that had been active,
  // so that all items are filtered in at this point.
  viewer.addListener("facetsSet", function(facets) {
    var name, sortOption
    // set up the sorting options
    sortBox.innerHTML = ""
    for (name in facets) {
      if (hasOwnProperty.call(facets, name)) {
        if (facets[name].isFilterVisible) {
          sortOption = makeElement("option", null, sortBox)
          sortOption.value = name
          addText(sortOption, name)
        }
      }
    }
    // tell the viewer which sort option we're using first
    viewer.sortBy(sortBox.value)

    setView(currentView)
  })

  // any time the user interacts with the viewer, focus the offscreen text box so we can catch directional arrows
  div.addEventListener("click", function(e) {
    var target = e.target
    if (target !== sortBox) {
      inputElmt.focus()
    }
  })

  return viewer
})

Seadragon2.ImageManager.disable()
