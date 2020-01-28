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
 * @param useHistory {bool} Whether to update the URL to represent current filter state
 * @return {Pivot.PivotViewer}
 */
var Pivot_init = (Pivot.init = function(
  div,
  { useHistory = false, initialView = "grid" } = {}
) {
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

  // initial state
  var hasStateBeenAppliedFromURL = false

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
  var filterPane = makeElement(
    "div",
    "pivot pivot_pane pivot_filterpane",
    canvasBox
  )

  var railWidth = filterPane.offsetLeft + filterPane.offsetWidth
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
      filterPane.className += " pivot_faded"

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
                refreshFilterPane()
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
      filterPane.className = filterPane.className.replace(" pivot_faded", "")
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
      filterPane.className += " pivot_faded"
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
      filterPane.className = filterPane.className.replace(" pivot_faded", "")
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

  var searchForm, // the HTML form element containing the search box
    searchBox, // the HTML input element for entering text searches
    activeSearch, // the string that we're searching for, or falsy if no current search
    searchSuggestions, // the HTML list containing suggested searches (word wheel)
    searchButton, // the HTML element you can click on to initiate a search
    suggestionsCount, // the number of search suggestions currently displayed in the word wheel
    currentSuggestion, // if the user uses up and down keys to access a suggested search,
    // this value will be the index of her current selection
    nextSearch, // the text the user has entered into the search box
    facetVerticalSpace, // the height (in pixels) that can't be used by the currently open category (negative)
    openFacet, // the HTML element that is currently open for selecting filters
    openFacetHeading, // the HTML element that has the title of the currently open facet category
    openFacetName, // the facet that has been selected in the filter pane
    openFacetType, // the type of facet that is open (as a string)
    activeFilters, // all currently active filters, keyed by facet name
    filtersCount, // the number of filters currently applied, not counting search box
    clearOption, // the HTML element for the filter pane's "clear all" button
    clearButtons, // the HTML elements for each facet's clear button, keyed by facet name
    wordwheelFacets // an array of all facet names that are visible in the word wheel

  // for String facets, set a filter for the given facet name to include
  // the given array of facet values, or remove the filter if the values
  // array is null or empty.
  function resetFilter(facet, values, type) {
    var filterData = activeFilters[facet],
      clearButton,
      filterFunc
    if (values && values.length > 0) {
      //setting a filter
      if (filterData) {
        // the filter already existed, just update its values
        filterData.values = values
      } else {
        // create a new filter
        switch (type) {
          case "String":
          case "LongString":
          case "Link":
            // string and link values use an array of string values
            // or objects with a string content property.
            // we can treat them pretty much the same.
            filterFunc = function(item) {
              return filterData.values.some(function(value) {
                // find the array of string values for this facet,
                // keeping in mind that all facets are optional.
                var facetArray = item.facets[facet]
                return facetArray
                  ? facetArray.some(function(value2) {
                      value2 = value2.content || value2
                      return value === value2
                    })
                  : value === "(no info)"
              })
            }
            break
          case "DateTime":
          case "Number":
            // numbers only have one range, but DateTime filters
            // may have several. we can treat them the same.
            filterFunc = function(item) {
              return filterData.values.some(function(value) {
                var facetArray = item.facets[facet]
                return facetArray
                  ? facetArray.some(function(value2) {
                      return (
                        value2 >= value.lowerBound &&
                        (value.inclusive
                          ? value2 <= value.upperBound
                          : value2 < value.upperBound)
                      )
                    })
                  : value.lowerBound === undefined
              })
            }
            break
          default:
            Seadragon2.Debug.warn("Unrecognized facet type " + type)
            return
        }
        filterData = activeFilters[facet] = {
          filter: filterFunc,
          values: values,
        }
        viewer.addFilter(filterData.filter)
        filtersCount++
        clearButton = clearButtons[facet]
        if (clearButton) {
          clearButton.style.visibility = "visible"
        }
        if (filtersCount === 1) {
          clearOption.style.visibility = "visible"
        }
      }
    } else {
      // clearing a filter
      if (filterData) {
        delete activeFilters[facet]
        viewer.removeFilter(filterData.filter)
        filtersCount--
      }
      clearButton = clearButtons[facet]
      if (clearButton) {
        clearButton.style.visibility = "" // default is hidden
      }
      if (!filtersCount && !activeSearch) {
        clearOption.style.visibility = ""
      }
    }
  }

  // for String facets, handle a click on one of the checkboxes in the
  // currently open facet.
  function onFacetValueCheckboxClicked(e) {
    var filterData = activeFilters[openFacetName],
      index,
      facetName = openFacetName

    if (e.target.checked) {
      if (filterData) {
        filterData.values.push(e.target.name)
      } else {
        resetFilter(facetName, [e.target.name], openFacetType)
      }
    } else {
      index = filterData.values.indexOf(e.target.name)
      if (index !== -1) {
        filterData.values.splice(index, 1)
      }
      if (!filterData.values.length) {
        resetFilter(openFacetName)
      }
    }

    // start the filtering operation
    viewer.filter()
  }

  // for String facets, handle a click on the facet-value label next
  // to the checkbox.
  function onFacetValueNameClicked(e) {
    var filterData = activeFilters[openFacetName]
    var checkBox = e.target.parentNode.previousSibling
    checkBox.checked = true
    var name = checkBox.name
    var i, n, list
    if (!filterData) {
      // this is the first name clicked in this tab, so it
      // will act the same as the checkbox
      onFacetValueCheckboxClicked({
        target: checkBox,
      })
    } else {
      // reset the checkboxes
      list = openFacet.lastChild.childNodes
      n = list.length
      for (i = 0; i < n; i++) {
        checkBox = list[i].firstChild
        if (checkBox.name !== name) {
          checkBox.checked = false
        }
      }
      // update the filter
      filterData.values = [name]
      // push the update into the viewer
      viewer.filter()
    }
  }

  // handle a range filter being applied by the user messing with the number slider.
  function onNumberRangeSet(facet, min, max, inclusive) {
    resetFilter(
      facet,
      [
        {
          lowerBound: min,
          upperBound: max,
          inclusive: inclusive,
        },
      ],
      "Number"
    )
    viewer.filter()
  }

  // handle a range filter being removed from the number slider
  function onNumberRangeUnset(facet) {
    resetFilter(facet)
    viewer.filter()
  }

  // handle a modification to the open datetime facet's filters
  function onDateRangeSet(facet, values) {
    resetFilter(facet, values, "DateTime")
    viewer.filter()
  }

  // comparator functions for sorting string facets
  function compareByQuantity(a, b) {
    return b.count - a.count
  }
  function compareAlphabetical(a, b) {
    a = a.value
    b = b.value
    return a === b
      ? 0
      : a === "(no info)"
      ? 1
      : b === "(no info)"
      ? -1
      : a > b
      ? 1
      : -1
  }

  // handle a click on the button that changes sort order for the currently open string facet
  function onSortLabelClick() {
    openFacetHeading.currentComparator =
      (openFacetHeading.currentComparator + 1) %
      openFacetHeading.comparators.length
    refreshFilterPane()
  }

  // handle a click on one of the facet headings in the filter pane.
  // it should close the open facet, if there was one, and then open up
  // filtering options for the newly selected facet.
  function onFacetClicked(e) {
    if (openFacet) {
      openFacet.style.height = "0px"
      openFacet.style.overflow = "hidden"
    }
    var target = e.target
    if (!target.name) {
      target = target.parentNode
    }
    openFacetHeading = target
    openFacetName = target.name
    openFacetType = target.facetType
    var nextSibling = target.nextSibling
    nextSibling.innerHTML = ""

    // add selection options to this facet, based on the counts for all
    // items in the collection, not counting filters selected in this facet.
    var currentFilter = activeFilters[openFacetName] || {}
    var items = viewer.runFiltersWithout(currentFilter.filter)
    var facetValues,
      value,
      facetValuesArray,
      facetOption,
      checkBox,
      label,
      count,
      currentFilterValues,
      outerLabel,
      countFacetValue
    switch (openFacetType) {
      case "Link":
      case "String":
      case "LongString":
        // start by counting all occurences of each value for this facet
        facetValues = {} // keyed by facet value, each value is a count of frequency
        countFacetValue = function(value) {
          // check for the link type's content property, since we're treating
          // them just like string values otherwise.
          value = value.content || value
          if (!facetValues[value]) {
            facetValues[value] = 0
          }
          facetValues[value]++
        }
        items.forEach(function(item) {
          if (item.facets[openFacetName]) {
            item.facets[openFacetName].forEach(countFacetValue)
          } else {
            countFacetValue("(no info)")
          }
        })

        // next, sort them based on the current sort order
        facetValuesArray = []
        for (value in facetValues) {
          if (hasOwnProperty.call(facetValues, value)) {
            facetValuesArray.push({
              value: value,
              count: facetValues[value],
            })
          }
        }
        facetValuesArray.sort(target.comparators[target.currentComparator])

        // finally, add the UI elements to select these facets
        var sortOrderLabel = makeElement("div", "pivot_sortlabel", nextSibling)
        addText(
          sortOrderLabel,
          target.comparatorNames[target.currentComparator]
        )
        sortOrderLabel.onclick = onSortLabelClick
        var facetOptions = makeElement("ul", "pivot", nextSibling)
        currentFilterValues = currentFilter.values || []
        facetValuesArray.forEach(function(value) {
          facetOption = makeElement("li", null, facetOptions)
          checkBox = makeElement(
            "input",
            "pivot pivot_facetcheckbox",
            facetOption
          )
          checkBox.setAttribute("type", "checkbox")
          checkBox.name = value.value
          if (currentFilterValues.indexOf(value.value) !== -1) {
            checkBox.checked = true
          }
          checkBox.onclick = onFacetValueCheckboxClicked
          outerLabel = makeElement("div", "pivot_outerlabel", facetOption)
          outerLabel.onclick = onFacetValueNameClicked
          count = makeElement("div", "pivot_facetcount", outerLabel)
          addText(count, value.count)
          label = makeElement("div", "pivot_facetlabel", outerLabel)
          addText(label, value.value)
          facetOption.title = value.value
        })
        break
      case "Number":
        var numberPicker = new PivotNumberPicker(
          nextSibling,
          items,
          openFacetName,
          currentFilter.values
        )
        numberPicker.addListener("filter", onNumberRangeSet)
        numberPicker.addListener("unfilter", onNumberRangeUnset)
        break
      case "DateTime":
        var datePicker = new PivotDatePicker(
          nextSibling,
          items,
          openFacetName,
          currentFilter.values
        )
        datePicker.addListener("filter", onDateRangeSet)
        break
      default:
        Seadragon2.Debug.warn("Unrecognized facet type: " + openFacetType)
    }

    // now open up the facet
    nextSibling.style.height =
      Math.max(
        150,
        parseFloat(Seadragon2.Element.getStyle(filterPane).height) +
          facetVerticalSpace
      ) + "px"
    nextSibling.style.overflowY = "auto"
    openFacet = nextSibling
  }

  // update the filter pane, due to another filter being applied somewhere.
  // this should make the filter pane display new values for quantity,
  // rearrange checkboxes, etc.
  function refreshFilterPane() {
    if (openFacet) {
      onFacetClicked({
        target: openFacet.previousSibling,
      })
    }
  }

  // we may need to adjust filter pane heights when the viewer is resized
  viewer.addListener("resize", refreshFilterPane)

  // handle a click on a clear button
  function onClear(e) {
    resetFilter(e.target.parentNode.name)
    viewer.filter()
    refreshFilterPane()
    e.stopPropagation()
  }

  // From the Viewer's perspective, any filter is just a function that can be applied
  // to items and returns true or false. This is the filter that is run to select
  // items based on text search.
  function searchFilter(item) {
    var facets = item.facets
    var searchTerms = activeSearch
      .trim()
      .toLowerCase()
      .split(" ")
    return searchTerms.every(function(searchTerm) {
      return (
        item.name.toLowerCase().indexOf(searchTerm) !== -1 ||
        wordwheelFacets.some(function(facet) {
          var facetData = facets[facet]
          return (
            facetData &&
            facetData.some(function(value) {
              // Link type facets will have a property named content,
              // which contains a string representation of the facet for
              // use in text search.
              value = value.content || value

              // for a number, we need to format it into a string to do text search
              if (typeof value === "number") {
                value = PivotNumber_format(value)
              }

              // likewise for DateTimes, we need to format it as a string
              if (value instanceof Date) {
                value =
                  value.toLocaleDateString() + " " + value.toLocaleTimeString()
              }

              return value.toLowerCase().indexOf(searchTerm) !== -1
            })
          )
        })
      )
    })
  }

  // update the search box to whatever state it would be in if the user
  // weren't currently interacting with it. If a search is currently active,
  // the search box will show the string we searched for and the clear button
  // will be present. If no search is currently active, the box will show a
  // watermark and the search button will be disabled.
  function onSearchBlur() {
    if (activeSearch) {
      searchBox.value = activeSearch
      searchButton.className = "pivot_searchbtn pivot_clrsearch"
      searchButton.onmousedown = clearSearch
    } else {
      searchForm.className = "pivot_watermark"
      searchBox.value = "Search..."
      searchButton.onmousedown = null
    }
    searchSuggestions.innerHTML = ""
    currentSuggestion = -1
    suggestionsCount = 0
  }

  // clear the current text-search filter from the viewer. this function will also
  // start the viewer's rearrange step unless the wait parameter is true.
  function clearSearch(wait) {
    searchButton.className = "pivot_searchbtn"
    activeSearch = null
    if (!filtersCount) {
      clearOption.style.visibility = ""
    }
    onSearchBlur()
    viewer.removeFilter(searchFilter)
    if (wait !== true) {
      viewer.filter()
      refreshFilterPane()
    }
  }

  // handle a click on the "clear all" button
  function onClearAll(wait) {
    viewer.clearFilters()
    var facetName
    for (facetName in clearButtons) {
      if (hasOwnProperty.call(clearButtons, facetName)) {
        clearButtons[facetName].style.visibility = ""
      }
    }
    if (activeSearch) {
      clearSearch(true)
    }
    clearOption.style.visibility = ""
    activeFilters = {}
    filtersCount = 0
    if (wait !== true) {
      viewer.filter()
      refreshFilterPane()
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
    // refresh the view
    refreshFilterPane()
  })

  // build a filter for the current contents of the search box,
  // and apply it in the viewer.
  function onSearch() {
    var wasActive = !!activeSearch
    activeSearch = searchBox.value
    if (!wasActive) {
      viewer.addFilter(searchFilter)
    }
    clearOption.style.visibility = "visible"
    onSearchBlur()
    viewer.filter()
    refreshFilterPane()
  }

  // add results to the word wheel. the results parameter is an object,
  // keyed by string result, where the values are the quantity of each
  // result. in this function, we sort those results so that the most
  // popular ones come first, and add them to the word wheel. we stop
  // adding results once the word wheel fills up (10 results). this
  // function can be called multiple times with multiple batches of results.
  function addWordWheelResults(results) {
    var resultsArray = [],
      value
    for (value in results) {
      if (hasOwnProperty.call(results, value)) {
        resultsArray.push({
          value: value,
          count: results[value],
        })
      }
    }
    // sort them in order of descending popularity
    resultsArray.sort(function(a, b) {
      return b.count - a.count
    })
    resultsArray.every(function(result) {
      if (suggestionsCount >= 10) {
        return false
      }
      var resultElement = makeElement("li", null, searchSuggestions)
      addText(resultElement, result.value)
      resultElement.onmousedown = function() {
        searchBox.value = result.value
        onSearch()
      }
      suggestionsCount++
      return true
    })
  }

  // change the currently selected suggestion in the word wheel to
  // the suggestion with the provided index. an index of -1 means go
  // back to whatever the user typed.
  function updateSuggestion(nextSuggestion) {
    var highlighted = searchSuggestions.childNodes[currentSuggestion]
    if (highlighted) {
      highlighted.className = ""
    }

    // clamp the suggestion index to the allowed range
    currentSuggestion = nextSuggestion
    if (currentSuggestion >= suggestionsCount) {
      currentSuggestion = -1
    } else if (currentSuggestion < -1) {
      currentSuggestion = suggestionsCount - 1
    }

    // update the search box
    if (currentSuggestion === -1) {
      searchBox.value = nextSearch
    } else {
      highlighted = searchSuggestions.childNodes[currentSuggestion]
      highlighted.className = "pivot_highlight"
      searchBox.value = highlighted.firstChild.textContent
    }
  }

  // handle a keyup event in the search box. for most keys, we'll get a
  // new list of suggestions in response. for the down and up keys, we'll
  // cycle through the current suggestions.
  function onSearchKeyPress(e) {
    switch (e.keyCode) {
      case 38:
        // up arrow
        updateSuggestion(currentSuggestion - 1)
        break
      case 40:
        // down arrow
        updateSuggestion(currentSuggestion + 1)
        break
      case 13:
        // enter. it'll submit the form, but let's unfocus the text box first.
        inputElmt.focus()
        break
      default:
        nextSearch = searchBox.value
        var searchResults = viewer.runSearch(nextSearch, true)
        searchSuggestions.innerHTML = ""
        currentSuggestion = -1
        suggestionsCount = 0
        addWordWheelResults(searchResults.front)
        addWordWheelResults(searchResults.rest)
    }
  }

  // handle a focus event on the searchbox
  function onSearchFocus() {
    if (activeSearch) {
      searchButton.className = "pivot_searchbtn"
      // pop up the suggestions as if we had pressed a key
      onSearchKeyPress({})
    } else {
      searchForm.className = ""
      searchBox.value = ""
    }
    /* note that this must be on mousedown, not onclick!
           mousedown on this element happens before blur on the text box,
           but before click on this element. we change the text box's contents
           on blur, so using mousedown is the easiest solution. */
    searchButton.onmousedown = onSearch
  }

  // unfortunately, we can't serialize the activeFilters object directly because it's full of
  // functions, DOM objects, and things that don't serialize cleanly, so manually run through
  // it, copying useful stuff into another object, and serialize that copy.
  function serializeFilters() {
    var filtersCopy = {},
      facetName
    for (facetName in activeFilters) {
      if (hasOwnProperty.call(activeFilters, facetName)) {
        var originalValues = activeFilters[facetName].values
        var valuesCopy = []
        var dataType
        var i,
          n = originalValues.length
        for (i = 0; i < n; ++i) {
          var value = originalValues[i]
          if (typeof value === "string") {
            valuesCopy.push(value)
            dataType = "String"
          } else {
            // assume it's a range, either numbers or dates
            var lowerBound = value.lowerBound
            var upperBound = value.upperBound
            if (
              typeof lowerBound !== "number" &&
              typeof upperBound !== "number"
            ) {
              // not a number, must be dates
              lowerBound = lowerBound.getTime()
              upperBound = upperBound.getTime()
              dataType = "DateTime"
            } else {
              dataType = "Number"
            }
            valuesCopy.push({
              lowerBound: lowerBound,
              upperBound: upperBound,
              inclusive: value.inclusive,
            })
          }
        }
        filtersCopy[facetName] = {
          values: valuesCopy,
          dataType: dataType,
        }
      }
    }
    return JSON.stringify({
      filters: Object.keys(filtersCopy).length > 0 ? filtersCopy : undefined,
      search: activeSearch || undefined,
      sortBy: sortBox.value,
      view: currentView,
    })
  }

  // apply a serialized set of filters. currently assumes that the viewer state is fresh
  // (no filters applied yet, in grid view mode)
  function deserializeAndApplyFilters(filterData) {
    filterData = JSON.parse(filterData)
    var filters = filterData.filters
    var search = filterData.search
    var sortBy = filterData.sortBy
    var facetName

    onClearAll(false)
    for (facetName in filters) {
      if (hasOwnProperty.call(filters, facetName)) {
        var filter = filters[facetName]
        var dataType = filter.dataType
        var values = filter.values
        if (dataType === "DateTime") {
          // we have to do some cleanup from the serialized version
          values.forEach(function(value) {
            value.lowerBound = new Date(value.lowerBound)
            value.upperBound = new Date(value.upperBound)
          })
        }
        if (dataType === "Number") {
          // and number filters need infinite values, but get serialized as null
          values.forEach(function(value) {
            if (value.lowerBound === null) {
              value.lowerBound = -Infinity
            }
            if (value.upperBound === null) {
              value.upperBound = Infinity
            }
          })
        }
        resetFilter(facetName, values, dataType)
      }
    }
    if (search) {
      searchBox.value = search
      onSearch()
    }
    if (sortBy) {
      sortBox.value = sortBy
      viewer.sortBy(sortBy)
    }
    if (typeof filterData.view === "string") {
      setView(filterData.view)
    }
    refreshFilterPane()
  }

  function getQueryVariable(name) {
    var query = location.search.substring(1)
    var vars = query.split("&")
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split("=")
      if (decodeURIComponent(pair[0]) == name) {
        return decodeURIComponent(pair[1])
      }
    }
    return null
  }

  function getPathWithState() {
    return `?state=${encodeURIComponent(serializeFilters())}`
  }

  function applyStateFromURL() {
    const state = getQueryVariable("state")
    if (!state) {
      return
    }

    try {
      deserializeAndApplyFilters(state)
    } catch (error) {
      Seadragon2.Debug.warn(`Bad URL state: ${error}`)
    }
  }

  // once we know about facets for the collection, we can build
  // the rest of the UI. note that this can be reset at any time,
  // if the current facets change. if the facets change, we expect
  // the viewer to have already dropped any filters that had been active,
  // so that all items are filtered in at this point.
  viewer.addListener("facetsSet", function(facets) {
    var name, sortOption
    // set up the sorting options
    wordwheelFacets = []
    sortBox.innerHTML = ""
    for (name in facets) {
      if (hasOwnProperty.call(facets, name)) {
        if (facets[name].isFilterVisible) {
          sortOption = makeElement("option", null, sortBox)
          sortOption.value = name
          addText(sortOption, name)
        }
        if (facets[name].isWordWheelVisible) {
          wordwheelFacets.push(name)
        }
      }
    }
    // tell the viewer which sort option we're using first
    viewer.sortBy(sortBox.value)

    // reset state variables
    activeFilters = {}
    filtersCount = 0
    currentSuggestion = -1
    suggestionsCount = 0
    activeSearch = null
    nextSearch = null
    openFacet = null
    openFacetName = ""
    openFacetType = null

    // fill out the filter pane.
    filterPane.innerHTML = ""
    facetVerticalSpace = -10
    var facetHeading, facetOptions, facet, facetTitle, clearButton
    clearOption = makeElement("div", "pivot_clrlabel pivot_clr", filterPane)
    clearOption.onclick = onClearAll
    clearButtons = {}
    clearButton = makeElement("div", "pivot_clrbtn pivot_clr", clearOption)
    clearButton.innerHTML = "&times;"
    addText(clearOption, "Clear All")
    searchForm = makeElement("form", null, filterPane)
    searchForm.onsubmit = function(e) {
      onSearch()
      e.preventDefault()
    }
    searchBox = makeElement("input", "pivot_searchbox", searchForm)
    searchBox.type = "text"
    searchBox.onfocus = onSearchFocus
    searchBox.onblur = onSearchBlur
    searchBox.onkeyup = onSearchKeyPress
    searchButton = makeElement("span", "pivot_searchbtn", searchForm)
    searchButton.innerHTML = "&times;"
    searchSuggestions = makeElement("ul", "pivot pivot_results", searchForm)
    onSearchBlur()
    facetVerticalSpace -= searchForm.offsetHeight + clearOption.offsetHeight
    var facetsArr = []
    for (name in facets) {
      if (hasOwnProperty.call(facets, name) && facets[name].isFilterVisible) {
        facetsArr.push(name)
      }
    }
    // make sure they go in the order that the CXML specified them, if any
    facetsArr.sort(function(a, b) {
      return (facets[a].index || 0) - (facets[b].index || 0)
    })
    var i,
      n = facetsArr.length
    for (i = 0; i < n; ++i) {
      name = facetsArr[i]
      facet = facets[name]
      facetHeading = makeElement("div", "pivot pivot_facetname", filterPane)
      facetHeading.onclick = onFacetClicked
      facetHeading.name = name
      facetHeading.facetType = facet.type
      if (
        facet.type === "String" ||
        facet.type === "LongString" ||
        facet.type === "Link"
      ) {
        // set up a few variables so we can keep track of our sorting order
        var comparatorNames = (facetHeading.comparatorNames = [])
        var comparators = (facetHeading.comparators = [])
        facetHeading.currentComparator = 0
        if (facet.orders && facet.orders.length && facet.comparator) {
          // we'll only support one custom sort order for now, because that's what pivot
          // seems to do. if we need to support more, we could.
          ;(function() {
            var temp = facet.comparator
            comparators.push(function(a, b) {
              return temp(a.value, b.value)
            })
          })()
          comparatorNames.push("Sort: " + facet.orders[0].name)
        }
        comparatorNames.push("Sort: Quantity")
        comparators.push(compareByQuantity)
        comparatorNames.push("Sort: A-Z")
        comparators.push(compareAlphabetical)
      }
      clearButton = clearButtons[name] = clearButton.cloneNode(true)
      clearButton.onclick = onClear
      facetHeading.appendChild(clearButton)
      facetTitle = makeElement("div", "pivot_facetlabel", facetHeading)
      addText(facetTitle, name)
      facetVerticalSpace -= facetHeading.offsetHeight
      facetOptions = makeElement("div", "pivot pivot_facetvalues", filterPane)
      facetOptions.style.height = 0
      facetOptions.style.overflow = "hidden"
    }

    // apply filters from URL
    setView(currentView)
    if (useHistory) {
      hasStateBeenAppliedFromURL = true
      applyStateFromURL()
      history.replaceState(null, "", getPathWithState())
    }
  })

  // any time the user interacts with the viewer, focus the offscreen text box so we can catch directional arrows
  div.addEventListener("click", function(e) {
    var target = e.target
    if (target !== searchBox && target !== sortBox) {
      inputElmt.focus()
    }
  })

  // put the current filter state in the query after any rearrange operation
  if (useHistory) {
    viewer.addListener("finishedRearrange", function() {
      if (hasStateBeenAppliedFromURL) {
        hasStateBeenAppliedFromURL = false
        return
      }
      history.pushState(null, "", getPathWithState())
    })

    window.addEventListener("popstate", function(event) {
      hasStateBeenAppliedFromURL = true
      applyStateFromURL()
    })
  }

  return viewer
})

Seadragon2.ImageManager.disable()

// in order to support the HTML-only scenario, we check for any items
// with class "pivot_ajax_viewer" and set them up automatically.
// if a location to fetch CXML was also provided, we'll start getting it.
// Chrome seems to trigger DOMContentLoaded before it's given layout to the viewer,
// which is a problem because we'll get invalid values for the available layout space.
// Instead, wait for the "load" event, which could be much later.
addEventListener(
  "load",
  function() {
    var i, n, div, url, viewer
    var viewers = document.getElementsByClassName("pivot_ajax_viewer")
    n = viewers.length
    for (i = 0; i < n; i++) {
      div = viewers[i]
      url = div.getAttribute("data-collection")
      var useHistory = div.getAttribute("data-use-history")
      useHistory = useHistory && useHistory.toLowerCase() !== "false"
      viewer = Pivot_init(div, useHistory)
      div.pivotViewer = viewer
      if (url) {
        PivotCxmlLoader.load(viewer, url)
      }
    }
  },
  false
)
