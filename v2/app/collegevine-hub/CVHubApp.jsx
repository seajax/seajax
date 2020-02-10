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

  var detailsPane = makeElement(
    "div",
    "pivot pivot_pane pivot_detailspane",
    canvasBox
  )
  detailsPane.style.opacity = 0
  detailsPane.style.display = "none"
  var button = makeElement(
    "div",
    "pivot_hoverable pivot_left pivot_larr",
    detailsPane
  )
  button.onclick = function() {
    viewer.moveLeft()
  }
  button = makeElement(
    "div",
    "pivot_left pivot_subtle pivot_vertbar",
    detailsPane
  )
  addText(button, "|")
  button = makeElement(
    "div",
    "pivot_hoverable pivot_left pivot_rarr",
    detailsPane
  )
  button.onclick = function() {
    viewer.moveRight()
  }
  button = makeElement(
    "div",
    "pivot_hoverable pivot_right pivot_collapse",
    detailsPane
  )
  button.onclick = function() {
    viewer.collapseDetails()
  }
  var detailsPaneTitle = makeElement("h2", "pivot", detailsPane)
  detailsPaneTitle = makeElement("a", "pivot", detailsPaneTitle)
  detailsPaneTitle.setAttribute("target", "_blank")
  var detailsPaneContent = makeElement(
    "div",
    "pivot pivot_scrollable",
    detailsPane
  )
  var detailsPaneDescription = makeElement(
    "div",
    "pivot pivot_description",
    detailsPaneContent
  )
  var detailsPaneMore = makeElement(
    "div",
    "pivot_sortlabel",
    detailsPaneContent
  )
  var detailsPaneFacets = makeElement("dl", "pivot", detailsPaneContent)
  makeElement("div", "pivot_horizbar", detailsPane)
  var legalStuff = makeElement("div", "pivot_copyright", detailsPane)
  var detailsPaneShowing

  var infoButton = makeElement("div", "pivot_info", canvasBox)
  infoButton.style.display = "none"
  infoButton.onclick = function() {
    viewer.expandDetails()
  }
  var infoButtonShowing = false

  // helper functions for expanding the description section of the details pane
  var growDescription
  function shrinkDescription() {
    detailsPaneDescription.style.height = "80px"
    detailsPaneMore.innerHTML = "more"
    detailsPaneMore.onclick = growDescription
  }
  growDescription = function() {
    detailsPaneDescription.style.height = "auto"
    detailsPaneMore.innerHTML = "less"
    detailsPaneMore.onclick = shrinkDescription
  }

  var infoButtonTimeout, detailsPaneTimeout

  // a handler to deal with showing the details pane for a particular item,
  // when the viewport is zoomed in close to that item.
  viewer.addListener("showDetails", function(item, facets) {
    if (!detailsPaneShowing) {
      detailsPane.style.display = "" // back to default
      // this will css transition in supported browsers
      setTimeout(function() {
        detailsPane.style.opacity = 1
      }, 0)

      // make sure the details pane won't get removed if it was fading
      if (detailsPaneTimeout !== undefined) {
        clearTimeout(detailsPaneTimeout)
        detailsPaneTimeout = undefined
      }
    }
    if (item !== detailsPaneShowing) {
      detailsPaneTitle.innerHTML = ""
      addText(detailsPaneTitle, item.name || "???")
      var href = item.href
      if (href) {
        detailsPaneTitle.setAttribute("href", href)
      }
      detailsPaneContent.style.height =
        parseFloat(Seadragon2.Element.getStyle(detailsPane).height) -
        detailsPaneContent.offsetTop -
        25 +
        "px"
      detailsPaneDescription.innerHTML = ""
      if (item.description) {
        addText(detailsPaneDescription, item.description)
      }
      detailsPaneDescription.style.height = "auto"
      // now it should have its layout set, so collapse description if necessary
      if (detailsPaneDescription.offsetHeight > 80) {
        shrinkDescription()
        detailsPaneMore.style.display = "block"
      } else {
        detailsPaneMore.style.display = "none"
      }
      // go through its facets and show them
      detailsPaneFacets.innerHTML = ""
      var facetName,
        itemFacets = item.facets,
        facetValues,
        facetDT,
        facetDD,
        facetValDiv,
        i,
        n,
        filter,
        value,
        a,
        facetCategory,
        facetsArr = []
      for (facetName in itemFacets) {
        facetCategory = facets[facetName]
        if (
          hasOwnProperty.call(itemFacets, facetName) &&
          facetCategory &&
          facetCategory.isMetaDataVisible
        ) {
          facetsArr.push(facetName)
        }
      }
      // match original order if there is one
      facetsArr.sort(function(a, b) {
        return (facets[a].index || 0) - (facets[b].index || 0)
      })
      var j,
        m = facetsArr.length
      for (j = 0; j < m; ++j) {
        facetName = facetsArr[j]
        facetCategory = facets[facetName]
        facetDT = makeElement("dt", "pivot", detailsPaneFacets)
        addText(facetDT, facetName)
        facetValues = itemFacets[facetName]
        facetValues = itemFacets[facetName]
        n = facetValues.length
        facetDD = makeElement("dd", "pivot", detailsPaneFacets)
        for (i = 0; i < n; i++) {
          facetValDiv = makeElement("div", undefined, facetDD)
          filter = undefined
          value = facetValues[i]
          switch (facetCategory.type) {
            case "String":
            case "LongString":
              addText(facetValDiv, value)
              filter = value
              break
            case "Link":
              a = makeElement("a", undefined, facetValDiv)
              a.target = "_blank"
              a.href = value.href
              addText(a, value.content)
              break
            case "Number":
              addText(facetValDiv, PivotNumber_format(value))
              filter = { upperBound: value, lowerBound: value, inclusive: true }
              break
            case "DateTime":
              addText(
                facetValDiv,
                value.toLocaleDateString() + " " + value.toLocaleTimeString()
              )
              filter = {
                lowerBound: value,
                upperBound: new Date(value.getTime() + 1000),
              }
              break
            default:
              Seadragon2.Debug.warn(
                "Unrecognized facet type in details pane: " + facetCategory.type
              )
          }
          if (filter !== undefined && facetCategory.isFilterVisible) {
            // the user should be able to click on this value to re-filter by it.
            facetValDiv.className += " pivot_filterable"
            // new variable scope so we can bind to variables
            ;(function() {
              var facet = facetName,
                values = [filter],
                type = facetCategory.type
              facetValDiv.onclick = function() {
                onClearAll(true)
                resetFilter(facet, values, type)
                // refreshFilterPane()
                viewer.filter()
              }
            })()
          }
        }
      }
      detailsPaneShowing = item
    }
  })

  // if the viewport zooms away from the previously selected item, it will raise a hideDetails
  // event, so we remove the details pane in response.
  viewer.addListener("hideDetails", function() {
    if (detailsPaneShowing) {
      detailsPane.style.opacity = 0
      detailsPaneTimeout = setTimeout(function() {
        detailsPane.style.display = "none"
        detailsPaneTimeout = undefined
      }, 500) // TEMP hard-coded fading speed!
      detailsPaneShowing = null
    }
  })

  // show the info button (the collapsed version of the details pane)
  viewer.addListener("showInfoButton", function() {
    if (!infoButtonShowing) {
      infoButton.style.display = "" // back to default
      // this will css transition in supported browsers
      setTimeout(function() {
        infoButton.style.opacity = 1
      }, 0)
      infoButtonShowing = true

      // make sure the info button won't get removed if it was fading
      if (infoButtonTimeout !== undefined) {
        clearTimeout(infoButtonTimeout)
        infoButtonTimeout = undefined
      }
    }
  })

  // hide the info button (the collapsed details pane)
  viewer.addListener("hideInfoButton", function() {
    if (infoButtonShowing) {
      infoButton.style.opacity = 0
      infoButtonTimeout = setTimeout(function() {
        infoButton.style.display = "none"
        infoButtonTimeout = undefined
      }, 500) // TEMP hard-coded fading speed!
      infoButtonShowing = false
    }
  })

  // the rest of the top bar stuff.
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

  // handle a click on the "clear all" button
  function onClearAll(wait) {
    viewer.clearFilters()
    activeFilters = {}
    if (wait !== true) {
      viewer.filter()
    }
  }

  // this event is only raised for filter changes that originate inside the viewer,
  // such as clicking on a bar of the graph view. it is the way that the viewer can
  // request a filter to be applied to itself. by using this model, we keep filter
  // management together in one place (here), even though the viewer occasionally
  // has to ask for filters. in response, we must create the requested filter and
  // apply it.
  viewer.addListener("filterrequest", function(newFilter) {
    var facetType = newFilter.type,
      filterValues = newFilter.values
    // we have to update our representation of active filters
    resetFilter(newFilter.facet, filterValues, facetType)
    if (
      (facetType === "String" ||
        facetType === "Link" ||
        facetType === "LongString") &&
      filterValues.length === 1
    ) {
      // numbers and dates re-bucketize and look awesome, but strings don't
      setView("grid")
    } else {
      viewer.filter()
    }
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
