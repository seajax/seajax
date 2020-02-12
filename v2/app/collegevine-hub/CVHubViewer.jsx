/*global Seadragon2, window, PivotNumber_format, PivotDate_generateBuckets,
makeElement, addText, hasOwnProperty, makeTemplate, document, lzwEncode, location*/

// Viewer. This is written so that it is a consumer of the Seadragon2 library
// rather than being a part of it (the only global variable reference is Seadragon2).
/**
 * The main viewer control. It attempts to mimic the functionality of Silverlight's
 * PivotViewer control. See the
 * <a href="../../app/pivot/quickstart.html">developer's guide</a> for an overview with
 * examples. It has methods to add and remove content, and change filtering and sorting.
 * Rather than calling its constructor directly, you probably want to call Pivot.init
 * to generate a PivotViewer instance. This class can raise the following custom events:
 * <dl>
 * <dt>itemsCleared</dt><dd>function(): The collection has been cleared in response to a
 * call to the clearItems method, and now the viewer is ready for other method calls.</dd>
 * <dt>hideDetails</dt><dd>function(): The UI should hide the details pane.</dd>
 * <dt>hideInfoButton</dt><dd>function(): The UI should hide the info button (the
 * placeholder for a collapsed details pane).</dd>
 * <dt>zoom</dt><dd>function(zoomPercent): The UI should change its zoom slider to the
 * given percentage.</dd>
 * <dt>showDetails</dt><dd>function(centerItem, facets): The UI should show the details
 * pane, and fill in information about the provided centerItem. The viewer's list of
 * all facet categories is passed along too.</dd>
 * <dt>showInfoButton</dt><dd>function(): The UI should show the info button (the
 * placeholder for a collapsed details pane).</dd>
 * <dt>filterrequest</dt><dd>function(filter): The user has clicked on a graph bar and
 * requested a new filter be applied. The UI should respond by updating its filter pane
 * state appropriately and calling addFilter on the viewer with the requested filter.
 * The UI must then call the viewer's filter method to initiate the update.</dd>
 * <dt>facetsSet</dt><dd>function(facets): A new set of facets was set as a result of
 * calling the setFacets method. The UI should update its filter and sort options to
 * match.</dd>
 * <dt>titleChange</dt><dd>function(title): The UI should update its collection title
 * to the given string.</dd>
 * <dt>copyright</dt><dd>function(legalInfo): The UI should change its copyright notice
 * to the given string and URL.</dd>
 * <dt>finishedRearrange</dt><dd>A rearrangement animation has finished.</dd>
 * </dl>
 * @class PivotViewer
 * @namespace Pivot
 * @extends Seadragon2.EventManager
 * @constructor
 * @param canvas {HTMLCanvasElement} The canvas on which this viewer should draw content
 * @param container {HTMLElement} The parent element of the canvas. Should be the same
 * size and position onscreen as the canvas.
 * @param frontLayer {HTMLElement} The DOM layer for content that goes in front of the
 * canvas. Should be the same size and position onscreen as the canvas.
 * @param backLayer {HTMLElement} The DOM layer for content that goes behind the canvas.
 * Should be the same size and position onscreen as the canvas.
 * @param leftRailWidth {number} The distance in pixels to save on the left side for the
 * filter pane
 * @param rightRailWidth {number} The distance in pixels that will be taken on the right
 * side by the details pane, whenever it is active
 * @param inputElmt {HTMLInputElement} A focusable textbox that is in the DOM but not
 * visible to the user.
 */
var PivotViewer = (Pivot.PivotViewer = function(
  canvas,
  container,
  frontLayer,
  backLayer,
  leftRailWidth,
  rightRailWidth,
  inputElmt
) {
  // Fields

  var facets = {},
    items = [],
    sortFacet = ""

  var self = this

  var innerTracker

  var viewport

  var animating = false
  var rearranging = false

  var activeItems = {} // all items that are currently filtered in, by ID
  var prevActiveItems = {} // same thing, but before the current filter was applied
  var rearrangingItems = {} // items that are moving in the current rearrange step
  var currentItems = {} // any items that are onscreen after the current rearrange step

  var allItemsById = {} // lets us look up any item in the collection by ID

  // it turns out iterating over properties in an object is pretty expensive,
  // so we'll optimize a bit by keeping track of the active items in an array too
  var activeItemsArr = []
  var rearrangingItemsArr = []

  // external
  let _activeItems = {}
  let _activeItemsArr = []
  let _activeGroups = []

  var isGridView = true

  var now = new Date().getTime()

  // like Springs constants, but for rearranging
  var stiffness = 8
  var springConstant = 1 / (2 * (Math.exp(stiffness / 2) - 1))

  var ctx = canvas.getContext("2d")

  var filters = []

  var lastMousePosition
  var hoveredItem
  var hoveredItemIndex // which of the hovered item's positions actually has the mouse
  var selectedItem
  var selectedItemIndex
  var centerItem
  var centerItemIndex
  var topLeftItemInfo // item and index of top-left corner
  var rightmostItemInfo // item and index of last item
  var zoomedIn // whether we're zoomed close enough to need details pane
  var hoveredBar
  var barTemplate
  var bars = []
  var backZoomContainer
  var frontZoomContainer
  var dragCursorSet

  var itemBorder = 0.05

  var detailsEnabled = true

  // references for performance
  var originPoint = new Seadragon2.Point(0, 0)
  var drawImage = Seadragon2.Image.drawImage
  var transform = Seadragon2.Element.transform

  // keep track of whether we can skip the next redraw
  var anythingChanged = true

  // keep track of click timing so we can ignore double-clicks
  var lastClickTime = 0
  var doubleClickThreshold = 300

  // HTML item templates for different zoom levels
  var templates = []
  // put in a default template type for if none are specified
  templates[-1] = { type: "sdimg" }

  // the current level of HTML template being displayed (as an index into the templates array)
  var currentTemplateLevel = -1
  // the natural (maximum) width of the current template level
  var currentTemplateWidth
  // the scale factor applied to the HTML overlay layer
  var templateScale

  // the size of an item at home zoom, which is necessary for choosing the appropriate template size
  var finalItemWidth

  var delayedFunction // anything we need to run at the beginning of the next repaint

  // overlays
  var domHoverBorder
  var domSelectedBorder

  // the color of outlines for selected and hovered items
  var hoverBorderColor
  var selectedBorderColor

  // standard options we'll use for any deep zoom images
  var sdimgOpts = { manualUpdates: true }

  // detect an IE bug so we know whether to work around it
  var brokenInnerHTML = (function() {
    var a = makeElement("div")
    var b = makeElement("div")
    b.innerHTML = "a"
    a.appendChild(b)
    a.innerHTML = ""
    // at this point, b.firstChild has become null in IE only
    return !b.firstChild
  })()

  // a collection of items that need to be rendered server-side for performance
  var serverSideItems = {}

  // the timeout that will send off a batch of items to be processed on the render server
  var serverRenderTimeout

  // a map of template level to URL for server-side rendering that is in progress
  var contentPollingEndpoints = {}

  // the number of template levels currently being rendered server-side
  var contentPollingCount = 0

  // the number of times we have requested server-side rendering
  var renderRequestCount = 0

  // Helpers -- FILTERING

  function runFilters() {
    // clear the active items
    activeItems = {}
    activeItemsArr = []

    // run all current filters, and put the array contents in a set.
    // if this method is slow, try moving the inner function out here and keeping
    // a current-item variable instead of a closure. this way looks cleaner though.
    items.forEach(function(item) {
      if (
        filters.every(function(filter) {
          return filter(item)
        })
      ) {
        activeItems[item.id] = item
        activeItemsArr.push(item)
      }
    })
  }

  function setExternalActiveItems() {
    activeItems = _activeItems
    activeItemsArr = _activeItemsArr
  }

  // Helpers -- ARRANGEMENT

  // run the specified function at the beginning of the next repaint cycle. if the
  // second argument is supplied, wait that many cycles before calling the function.
  function delayFunction(func, delay) {
    if (!delay || delay < 0) {
      if (!delayedFunction) {
        delayedFunction = func
      } else {
        var otherFunc = delayedFunction
        delayedFunction = function() {
          otherFunc()
          func()
        }
      }
    } else {
      delayFunction(function() {
        delayFunction(func, delay - 1)
      })
    }
  }

  function getLocationOutside(locArray) {
    var containerSize = viewport.getContainerSize(),
      containerCenter = containerSize.times(0.5),
      center,
      farEnough = containerSize.x + containerSize.y,
      result = [],
      i,
      n = locArray.length,
      loc
    for (i = 0; i < n; i++) {
      loc = locArray[i]
      center = loc.getCenter().minus(containerCenter)
      center = center.times(farEnough / center.distanceTo(originPoint))
      result.push(
        new Seadragon2.Rect(
          center.x - 100,
          center.y - 100,
          loc.width * 1.2,
          loc.height * 1.2
        )
      )
    }
    return result
  }

  // put an HTML item template into the front layer of the viewer. if the HTML item hasn't been fully initialized
  // yet, finish it up. we do this to avoid loading images and such for items which haven't actually been put into
  // the DOM.
  function addElementToFrontLayer(htmlContent) {
    var unsetHTML = htmlContent.unsetHTML
    if (unsetHTML) {
      htmlContent.innerHTML = unsetHTML
      delete htmlContent.unsetHTML
    }
    frontLayer.appendChild(htmlContent)
  }

  // clone the given node, and also copy over the unsetHTML property.
  function clone(htmlElement) {
    var result = htmlElement.cloneNode(true)
    result.unsetHTML = htmlElement.unsetHTML
    return result
  }

  function beginAnimate(item) {
    var i,
      result = false,
      source = item.source,
      dest = item.destination,
      n = source.length, // we assume dest already has the same length
      startTime = (item.startTime = []),
      id = item.id,
      containerSize = viewport.getContainerSize(),
      containerX = containerSize.x / 2,
      containerY = containerSize.y / 2,
      curDest,
      sdimg = item.sdimg[currentTemplateLevel]

    for (i = 0; i < n; i++) {
      curDest = dest[i]
      if (!source[i].equals(curDest)) {
        // something is animating
        result = true

        // tell the update method when to start moving it
        startTime[i] = Math.random() * 300 + now

        // put it in the list to receive updates.
        // make sure we only add each item to the array once.
        if (!hasOwnProperty.call(rearrangingItems, id)) {
          rearrangingItemsArr.push(item)
        }
        rearrangingItems[id] = item

        // let the sdimg know where it's going and how big it'll be.
        // note that we need an offset so that foveation is to the middle.
        // this might be called multiple times for a single item, but
        // that should be okay.

        if (sdimg) {
          sdimg.update(
            new Seadragon2.Rect(
              curDest.x - containerX,
              curDest.y - containerY,
              curDest.width,
              curDest.height
            )
          )
        }
      }
    }

    // return true if animation will happen
    return result
  }

  function resetRearrangingItems() {
    // get all the items ready for their next move, whenever it may be
    var item, rect, rectString, rects, i, source, dest, n, j
    for (j = rearrangingItemsArr.length - 1; j >= 0; j--) {
      // the item's destination property is an array of rects to which it has
      // just moved. some of them may be duplicates; we need to prune those out.
      rects = {}
      item = rearrangingItemsArr[j]
      source = item.source = []
      dest = item.destination
      item.destination = undefined
      n = dest.length
      for (i = 0; i < n; i++) {
        rect = dest[i]
        rectString = rect.toString()
        if (!rects.hasOwnProperty(rectString)) {
          rects[rectString] = true
          source.push(rect)
        }
      }

      // now prune down the arrays of the HTML representations for that item,
      // to the same length.
      n = source.length
      item.html.forEach(function(templateArray, index) {
        if (templates[index].type === "html") {
          var removed = templateArray.splice(n, templateArray.length - n)

          // if this layer of HTML templates is in the view, remove the extras.
          if (index === currentTemplateLevel) {
            removed.forEach(function(domNode) {
              frontLayer.removeChild(domNode)
              domNode.pvInDom = false
            })
          }
        }
      })
    }
    rearrangingItems = {}
    rearrangingItemsArr = []
  }

  function setTransform(html, position) {
    transform(
      html,
      templateScale * position.x,
      templateScale * position.y,
      (position.width / currentTemplateWidth) * templateScale
    )
  }

  // this step reenables mouse tracking, among other things
  function finishRearrange() {
    self.removeListener("animationfinish", finishRearrange)
    innerTracker.setTracking(true)
    rearranging = false
    resetRearrangingItems()

    // raise an event to say that rearranging is done
    self.trigger("finishedRearrange")

    // raise an event if the collection just finished clearing
    if (!items.length && !activeItemsArr.length) {
      self.trigger("itemsCleared")
    }
  }

  // this step adds new items
  function rearrangePart4() {
    self.removeListener("animationfinish", rearrangePart4)
    resetRearrangingItems()
    var id,
      anythingInserted = false,
      item,
      j
    for (j = activeItemsArr.length - 1; j >= 0; j--) {
      item = activeItemsArr[j]
      id = item.id
      if (!hasOwnProperty.call(prevActiveItems, id)) {
        item.source = getLocationOutside(item.destination)
        beginAnimate(item)
        currentItems[id] = item
        anythingInserted = true

        // make additional copies of the HTML template if necessary
        item.html.forEach(function(htmlArray, index) {
          if (templates[index].type === "html") {
            var i
            for (i = item.source.length - 1; i > 0; i--) {
              htmlArray.push(clone(htmlArray[0]))
            }
          }
        })

        // append items to the DOM as necessary
        if (templates[currentTemplateLevel].type === "html") {
          item.html[currentTemplateLevel].forEach(function(node, index) {
            setTransform(node, item.source[index])
            addElementToFrontLayer(node)
            node.pvInDom = true
          })
        }
      }
    }

    if (anythingInserted) {
      // wait for rearrange to finish
      self.addListener("animationfinish", finishRearrange)
    } else {
      // immediately mark completion
      finishRearrange()
    }
  }

  // this step rearranges things that are still in view
  function rearrangePart3() {
    self.removeListener("animationfinish", rearrangePart3)
    var id,
      item,
      anythingMoved = false,
      source,
      dest,
      sourceLength,
      destLength,
      i,
      html

    // first, remove HTML content from the view for any items that have moved offscreen
    if (templates[currentTemplateLevel].type === "html") {
      for (i = rearrangingItemsArr.length - 1; i >= 0; i--) {
        html = rearrangingItemsArr[i].html[currentTemplateLevel]
        html.forEach(function(domElement) {
          frontLayer.removeChild(domElement)
          domElement.pvInDom = false
        })
        html.splice(1, html.length - 1)
      }
    }

    resetRearrangingItems()

    // recalculate template sizes and scaling for the front layer
    if (finalItemWidth && templates.length) {
      setupFrontLayer(1)
    }

    for (id in prevActiveItems) {
      if (
        hasOwnProperty.call(prevActiveItems, id) &&
        hasOwnProperty.call(activeItems, id)
      ) {
        item = prevActiveItems[id]
        source = item.source
        dest = item.destination
        sourceLength = source.length
        destLength = dest.length
        html = item.html

        // make sure the source and destination arrays are the same length
        // by inserting duplicates. we assume each has at least one entry.
        for (i = sourceLength; i < destLength; i++) {
          source.push(source[0])

          // we also must make duplicates of the HTML objects that represent this item, if
          // they are being used instead of drawing on a canvas.
          html.forEach(function(htmlArray, index) {
            if (templates[index].type === "html") {
              var first = htmlArray[0]
              var copy = clone(first)
              htmlArray.push(copy)
              if (index === currentTemplateLevel) {
                setTransform(copy, source[0])
                addElementToFrontLayer(copy)
                copy.pvInDom = true
              }
            }
          })
        }
        for (i = destLength; i < sourceLength; i++) {
          dest.push(dest[0])
        }

        if (beginAnimate(item)) {
          anythingMoved = true
        }
      }
    }

    if (anythingMoved) {
      // wait for rearrange to finish
      self.addListener("animationfinish", rearrangePart4)
    } else {
      // move along to insertion phase
      rearrangePart4()
    }
  }

  // this step removes things that were filtered out
  function rearrangePart2() {
    var id,
      item,
      anythingRemoved = false
    for (id in prevActiveItems) {
      if (
        hasOwnProperty.call(prevActiveItems, id) &&
        !hasOwnProperty.call(activeItems, id)
      ) {
        anythingRemoved = true
        item = prevActiveItems[id]
        item.destination = getLocationOutside(item.source)
        beginAnimate(item)
        delete currentItems[id]
      }
    }

    if (anythingRemoved) {
      // wait for removal animation to finish before rearranging
      self.addListener("animationfinish", rearrangePart3)
    } else {
      // move right along to rearrange phase
      rearrangePart3()
    }
  }

  function placeGrid(
    verticalOffset,
    horizontalOffset,
    allSortedItems,
    numPerRow,
    widthPerItem,
    heightPerItem,
    upward
  ) {
    var totalItemCount = allSortedItems.length,
      itemsPlaced = 0,
      i,
      firstRow = [],
      lastRow = [],
      curRow,
      destination,
      j,
      item,
      smallerDimension,
      padding,
      paddedHeight,
      paddedWidth,
      other,
      otherRow,
      itemInfo,
      offset,
      rightmost,
      lowest,
      topLeft

    // if we're placing items upward, the starting vertical offset given was the lower-left
    // corner of the bottom row. we'll place rows based on the upper-left corner, so shift
    // it up to start.
    if (upward) {
      verticalOffset -= heightPerItem
    }

    // iterate over the rows
    for (i = 0; itemsPlaced < totalItemCount; i++) {
      // calculate how much white space we need inside each edge (minimum)
      padding =
        (Math.max(widthPerItem, heightPerItem) * itemBorder) /
        (1 + 2 * itemBorder)
      paddedHeight = heightPerItem - padding * 2
      paddedWidth = widthPerItem - padding * 2

      // keep track of items placed so we can set up keyboard navigation
      curRow = []

      // iterate over the items in the row
      for (j = 0; j < numPerRow && itemsPlaced < totalItemCount; j++) {
        item = allSortedItems[itemsPlaced]

        if (item.normHeight > paddedHeight / paddedWidth) {
          // use the maximum height and leave extra room on the sides as necessary
          smallerDimension = paddedHeight / item.normHeight
          destination = new Seadragon2.Rect(
            horizontalOffset + (j + 0.5) * widthPerItem - smallerDimension / 2,
            verticalOffset + padding,
            smallerDimension,
            paddedHeight
          )
        } else {
          // use the maximum width and leave extra room above and below
          smallerDimension = paddedWidth * item.normHeight
          destination = new Seadragon2.Rect(
            horizontalOffset + j * widthPerItem + padding,
            verticalOffset + 0.5 * heightPerItem - smallerDimension / 2,
            paddedWidth,
            smallerDimension
          )
        }

        item.destination.push(destination)
        itemInfo = { item: item, index: item.destination.length - 1 }
        curRow.push(itemInfo)
        itemsPlaced++

        // the destination must know what items are next to it in each direction.
        // here, we set up left-right relationships within the row.
        other = curRow[j - 1] || (!upward && lastRow[lastRow.length - 1])
        if (other) {
          destination.left = other
          other.item.destination[other.index].right = itemInfo
        }

        // next, link to the row above the current one
        otherRow = upward ? firstRow : lastRow
        offset = upward ? -1 : 0
        other = otherRow[j + offset]
        if (other) {
          destination.up = other
          other.item.destination[other.index].down = itemInfo
        }

        // finally, link to the row below the current one
        otherRow = upward ? lastRow : firstRow
        offset = upward ? 0 : 1
        other = otherRow[j + offset]
        if (other) {
          destination.down = other
          other.item.destination[other.index].up = itemInfo
        }
      }

      // now that the current row has been placed, set up left-right relationships
      // between it and the previous row, for rows being placed upward
      if (upward) {
        other = lastRow[0]
        if (other) {
          destination.right = other
          other.item.destination[other.index].left = itemInfo
        }
      }

      if (!destination.down) {
        lowest = itemInfo
      }

      // keep track of the first and last rows placed so we can create up-down relationships
      if (!i) {
        firstRow = curRow
      }
      lastRow = curRow

      // move to the next row
      verticalOffset += upward ? -heightPerItem : heightPerItem
    }

    // return an object that contains info about the top-left and bottom-right items
    // in this grid. note that the bottom item (without an item below) may
    // not be the same as the right item, if placement is downwards.
    topLeft = upward ? lastRow[0] : firstRow[0]
    if (upward) {
      other = firstRow[firstRow.length - 1]
      lowest = other
      rightmost = other
    } else {
      rightmost = lastRow[lastRow.length - 1]
    }
    return {
      topLeft: topLeft,
      lowest: lowest,
      rightmost: rightmost,
      itemWidth: paddedWidth,
    }
  }

  // round the given positive number down to the nearest number that can be represented
  // as n * 10^m, where m is an integer and n is 1, 2.5, or 5.
  function makeFriendlyNumber(a) {
    var scale = Math.floor(Math.log(a) / Math.LN10),
      b = a * Math.pow(10, -scale),
      c = b < 2.5 ? 1 : b < 5 ? 2.5 : 5
    return c * Math.pow(10, scale)
  }

  var comparators = {
    Number: function(a, b) {
      return a - b
    },
    String: function(a, b) {
      return a > b ? 1 : a === b ? 0 : -1
    },
    Link: function(a, b) {
      a = a.content
      b = b.content
      return a > b ? 1 : a === b ? 0 : -1
    },
  }
  comparators.DateTime = comparators.Number
  comparators.LongString = comparators.String

  // these functions set up the bar categories for graph view.
  var bucketize = {
    String: function(facetName) {
      var item,
        bucketMap = {},
        id,
        facetData,
        bucket,
        allSortedItems = [],
        bucketName,
        i

      function putInBucket(bucketName) {
        // we use the same bucketing code for links, so check for its short value
        bucketName = bucketName.content || bucketName
        bucket = bucketMap[bucketName]
        if (!bucket) {
          bucket = bucketMap[bucketName] = {}
        }
        bucket[id] = item
      }

      for (i = activeItemsArr.length - 1; i >= 0; i--) {
        // any facet can have multiple values, and we sort the item into
        // all applicable buckets. if it doesn't have any values, put it
        // into the "(no info)" bucket.
        item = activeItemsArr[i]
        id = item.id
        facetData = item.facets[facetName]
        if (facetData) {
          facetData.forEach(putInBucket)
        } else {
          putInBucket("(no info)")
        }
      }

      for (bucketName in bucketMap) {
        if (hasOwnProperty.call(bucketMap, bucketName)) {
          allSortedItems.push({
            label: bucketName,
            items: bucketMap[bucketName],
            values: [bucketName],
          })
        }
      }

      var comparator =
        facets[facetName].comparator ||
        function(a, b) {
          return a > b ? 1 : a === b ? 0 : -1
        }

      // sort the buckets. by default, this is alphabetical, but the facet category
      // could define a more sensible sorting order for its contents.
      allSortedItems.sort(function(a, b) {
        var relation = comparator(a.label, b.label)
        return relation
          ? (relation > 0 && b.label !== "(no info)") || a.label === "(no info)"
            ? 1
            : -1
          : 0
      })

      // check whether there are too many buckets to look awesome, and if so, combine them
      // into bigger chunks
      var reducingFactor = Math.ceil(allSortedItems.length / 12)
      if (reducingFactor > 1) {
        var combinedItems = [],
          curBucketValues,
          curBucketItems,
          curBucket
        allSortedItems.forEach(function(bucket, index) {
          if (index % reducingFactor === 0 || bucket.label === "(no info)") {
            // start a new bucket!
            curBucket = {
              label: bucket.label,
            }
            combinedItems.push(curBucket)
            curBucketValues = curBucket.values = bucket.values
            curBucketItems = curBucket.items = bucket.items
          } else {
            // continue an existing bucket!
            curBucketValues.push(bucket.values[0])
            var id,
              items = bucket.items
            for (id in items) {
              if (hasOwnProperty.call(items, id)) {
                curBucketItems[id] = items[id]
              }
            }

            // check whether we should end working on this bucket
            if (
              index % reducingFactor === reducingFactor - 1 ||
              index === allSortedItems.length - 1 ||
              allSortedItems[index + 1].label === "(no info)"
            ) {
              // end the current bucket!
              curBucket.label += " to " + bucket.label
            }
          }
        })
        // now that we're done combining stuff, put it back in allSortedItems
        allSortedItems = combinedItems
      }

      // one last thing: transform our item lists from object to array
      allSortedItems.forEach(function(bucket) {
        var arr = [],
          id,
          items = bucket.items
        for (id in items) {
          if (hasOwnProperty.call(items, id)) {
            arr.push(items[id])
          }
        }
        bucket.items = arr
      })

      return allSortedItems
    },
    Number: function(facetName, isDate) {
      var item,
        facetData,
        max = -Infinity,
        min = Infinity,
        buckets = [],
        bucketWidth,
        i,
        noInfoItems,
        noInfoBucket,
        highestIndex,
        upperBound,
        leftLabel,
        rightLabel,
        putInBucket

      // first, find max and min
      function updateMinMax(value) {
        if (value > max) {
          max = value
        }
        if (value < min) {
          min = value
        }
      }
      for (i = activeItemsArr.length - 1; i >= 0; i--) {
        item = activeItemsArr[i]
        facetData = item.facets[facetName]
        if (facetData) {
          // any facet can have any number of values, and we'll use all of them.
          facetData.forEach(updateMinMax)
        } else {
          noInfoItems = true
        }
      }

      if (isDate) {
        // choose the bucket size.
        buckets = PivotDate_generateBuckets(min, max)
      } else {
        // next, choose the bucket size. this should make at least 4 bars, but no more than 11.
        bucketWidth = makeFriendlyNumber((max - min) / 4)

        // adjust min so it's friendly-value aligned
        if (bucketWidth) {
          min = bucketWidth * Math.floor(min / bucketWidth)
        }

        // most buckets will be closed on the lower end of their range and open on the upper end:
        // [min, max). The topmost bucket, however, includes its upper bound.
        // set them up here.
        for (
          i = min;
          i < max || (bucketWidth === 0 && !buckets.length);
          i += bucketWidth
        ) {
          upperBound = i + bucketWidth
          // TODO this should change depending on custom number display options.
          leftLabel = PivotNumber_format(i)
          rightLabel = PivotNumber_format(upperBound)
          buckets.push({
            label: leftLabel + " to " + rightLabel,
            lowerBound: i,
            upperBound: upperBound,
            leftLabel: leftLabel,
            rightLabel: rightLabel,
            items: [],
          })
        }
      }

      if (buckets.length) {
        highestIndex = buckets.length - 1
        buckets[highestIndex].inclusive = true
      }
      if (noInfoItems) {
        noInfoBucket = []
        buckets.push({
          label: "(no info)",
          items: noInfoBucket,
        })
      }

      // set up the function that is responsible for putting the current item
      // into one of the possible arrays, given its facet value (Number or DateTime).
      putInBucket = isDate
        ? function(value) {
            // since the width of each bucket isn't constant (some months
            // are longer and such), we iterate over the bucket categories.
            // A bit less elegant than the solution for Numbers, but still
            // technically constant time since we guarantee there will never
            // be more than 16 buckets.
            var i, bucket
            for (i = 0; i <= highestIndex; i++) {
              bucket = buckets[i]
              if (value < bucket.upperBound || i === highestIndex) {
                bucket.items.push(item)
                break
              }
            }
          }
        : function(value) {
            var index = Math.floor((value - min) / bucketWidth)
            // check for arithmetic error or width 0
            if (isNaN(index) || index < 0) {
              index = 0
            }
            if (index > highestIndex) {
              index = highestIndex
            }
            buckets[index].items.push(item)
          }

      // now iterate over the items again, putting them in the appropriate bucket.
      // note that each item may be listed in multiple buckets.
      for (i = activeItemsArr.length - 1; i >= 0; i--) {
        item = activeItemsArr[i]
        facetData = item.facets[facetName]
        if (facetData) {
          facetData.forEach(putInBucket)
        } else {
          noInfoBucket.push(item)
        }
      }

      return buckets
    },
  }
  bucketize.LongString = bucketize.String
  // links are a lot like strings, so we'll reuse the bucketizing code
  bucketize.Link = bucketize.String
  // likewise DateTimes can share some code with Numbers
  bucketize.DateTime = function(facetName) {
    return bucketize.Number(facetName, true)
  }

  // we need to lay out items in a grid, but we don't know ahead of time what
  // shape the items will be, or if they're all exactly the same shape. so we
  // take a geometric average of the height:width ratio for all items, and that
  // will be the space in which each item gets to draw itself.
  function getAverageItemHeight() {
    var sum = items.reduce(function(prev, item) {
      var normHeight = item.normHeight
      if (!normHeight) {
        normHeight = item.normHeight = item.sdimg[-1].state.source.normHeight
      }
      return prev + Math.log(normHeight)
    }, 1)
    var avg = Math.exp(sum / items.length)
    // we'll add padding evenly to both directions
    if (avg < 1) {
      avg = (avg + 2 * itemBorder) / (1 + 2 * itemBorder)
    } else {
      avg = (1 + 2 * itemBorder) / (1 / avg + 2 * itemBorder)
    }
    return avg
  }

  // find the best number of columns to use for a grid of items occupying the given
  // width and height, where each item's normalized height is given by itemHeight.
  function computeLayoutWidth(count, width, height, itemHeight) {
    // make a reasonable first approximation
    var result = Math.ceil(Math.sqrt((itemHeight * width * count) / height))
    // and then adjust it as necessary
    while (
      ((Math.ceil(count / result) * width) / result) * itemHeight >
      height
    ) {
      result++
    }
    return result
  }

  function clearHighlights() {
    var temp
    temp = domHoverBorder.parentNode
    if (temp) {
      temp.removeChild(domHoverBorder)
    }
    temp = domSelectedBorder.parentNode
    if (temp) {
      temp.removeChild(domSelectedBorder)
    }
  }

  // choose the template size to use
  function setupFrontLayer(zoom, bounds) {
    if (templates.length) {
      var oldTemplateLevel = currentTemplateLevel,
        id,
        item

      currentTemplateLevel = 0
      while (
        templates[currentTemplateLevel] &&
        templates[currentTemplateLevel].width < finalItemWidth * zoom
      ) {
        currentTemplateLevel++
      }
      if (currentTemplateLevel > templates.length - 1) {
        currentTemplateLevel = templates.length - 1
      }

      if (currentTemplateLevel !== oldTemplateLevel) {
        currentTemplateWidth = templates[currentTemplateLevel].width

        clearHighlights()

        // Remove the front layer contents (we'll repopulate it soon).
        // note that trying to clear them all at once via frontLayer.innerHTML="" doesn't work in IE,
        // since it breaks all relationships between children and grandchildren. however,
        // its removeChild implementation is so painfully slow that we really have no choice. It
        // seems that a single innerHTML="" plus a cloneNode per item is actually faster than
        // calling removeChild for every item.
        if (templates[oldTemplateLevel].type === "html") {
          for (id in currentItems) {
            if (hasOwnProperty.call(currentItems, id)) {
              item = currentItems[id]
              var htmlArr = item.html[oldTemplateLevel]
              htmlArr.forEach(function(htmlContent, index) {
                if (htmlContent.pvInDom) {
                  htmlContent.pvInDom = false
                  if (brokenInnerHTML) {
                    // make a copy of the node to save it from its imminent demise
                    htmlArr[index] = clone(htmlContent)
                  }
                }
              })
            }
          }
        }
        frontLayer.innerHTML = ""
      }

      var oldTemplateScale = templateScale
      templateScale = currentTemplateWidth / finalItemWidth

      if (oldTemplateScale !== templateScale) {
        // change the CSS size of the front zoom container so it can fit the new item arrangement at its
        // natural resolution. If the bounds parameter was not passed, we need to force an immediate update
        // to avoid graphical hiccups. Otherwise, it'll be updated elsewhere anyway.
        frontZoomContainer.setSizeRatio(templateScale, !bounds)

        // iterate over each position for each item, updating its location, and adding it to the DOM
        // if necessary.
        if (templates[currentTemplateLevel].type === "html") {
          for (id in currentItems) {
            if (hasOwnProperty.call(currentItems, id)) {
              item = currentItems[id]
              item.html[currentTemplateLevel].forEach(function(
                htmlContent,
                index
              ) {
                var sourceLocation = item.source[index]
                setTransform(htmlContent, sourceLocation)
                if (
                  currentTemplateLevel !== oldTemplateLevel &&
                  (!bounds || rectsOverlap(bounds, sourceLocation))
                ) {
                  addElementToFrontLayer(htmlContent)
                  htmlContent.pvInDom = true
                }
              })
            }
          }
        }
      }
    }
  }

  function rearrangePart1() {
    self.removeListener("animationfinish", rearrangePart1)

    // hide the details pane before we get started
    self.trigger("hideDetails")
    self.trigger("hideInfoButton")

    // make sure the update function will know what's going on
    rearranging = true
    anythingChanged = true

    resetRearrangingItems()

    // remember whatever is onscreen right now, since we'll need it during
    // the rearrange steps
    prevActiveItems = Seadragon2.Object.clone(currentItems)

    // now that the viewport has zoomed to its default position, run the filters
    setExternalActiveItems()

    // get rid of any grid bars we've drawn before
    backLayer.innerHTML = ""

    // figure out the aspect ratio for grid boxes
    var avgHeight = getAverageItemHeight()

    var facet = facets[sortFacet] || {},
      i

    // either an array of items, or an array of {label:string, items:array}
    var allSortedItems

    var numPerRow, widthPerItem, totalItemCount
    var containerSize = viewport.getContainerSize()
    var containerRect = new Seadragon2.Rect(
      0,
      0,
      containerSize.x,
      containerSize.y
    )

    // regardless of the current view type, we need to reset the destination array
    // for all current items
    for (i = activeItemsArr.length - 1; i >= 0; i--) {
      activeItemsArr[i].destination = []
    }

    // now that we have the items in order, arrange them
    if (isGridView) {
      // first, put the items in an array.
      allSortedItems = activeItemsArr

      // second, sort it.
      allSortedItems.sort(function(a, b) {
        a = a.facets[sortFacet]
        b = b.facets[sortFacet]
        // check for undefined values! all facets are optional, but
        // items without the facet listed should always be sorted last.
        if (!a) {
          if (!b) {
            return 0
          }
          return 1
        }
        if (!b) {
          return -1
        }
        // any facet may have multiple values, but we only sort by the first one
        a = a[0]
        b = b[0]

        // from here on, the comparison depends on the type. sometimes string facets
        // define custom comparators for orders that make more sense than alphabetical.
        var comparator = facet.comparator || comparators[facet.type]
        return comparator(a, b)
      })

      // third, lay out the items in a grid.
      totalItemCount = allSortedItems.length
      // compute layout width
      numPerRow = computeLayoutWidth(
        totalItemCount,
        containerRect.width,
        containerRect.height,
        avgHeight
      )
      widthPerItem = containerRect.width / numPerRow

      // check: if there's only one row, we can probably make it a bit bigger
      if (numPerRow > totalItemCount) {
        widthPerItem = Math.min(
          containerRect.width / totalItemCount,
          containerRect.height / avgHeight
        )
      }

      var gridInfo = placeGrid(
        0,
        0,
        allSortedItems,
        numPerRow,
        widthPerItem,
        widthPerItem * avgHeight
      )
      finalItemWidth = gridInfo.itemWidth
      topLeftItemInfo = gridInfo.topLeft
      rightmostItemInfo = gridInfo.rightmost
    } else {
      allSortedItems = _activeGroups

      var barWidth = containerRect.width / allSortedItems.length
      var innerBarWidth = barWidth * 0.86

      bars = []
      topLeftItemInfo = rightmostItemInfo = undefined

      // find the highest bar, so we can size them all properly
      var biggestCategoryCount = 0,
        currentCategory
      for (i = 0; i < allSortedItems.length; i++) {
        currentCategory = allSortedItems[i]
        if (currentCategory.items.length > biggestCategoryCount) {
          biggestCategoryCount = currentCategory.items.length
        }
      }

      // set up some styles that will be the same for all bars
      var sizeRatio = 100 / barWidth // the ratio between screen pixels and css pixels in the bars
      backZoomContainer.setSizeRatio(sizeRatio)
      barTemplate.style.height = sizeRatio * containerRect.height + "px"

      // if there are only a few bars, we don't want the labels getting ridiculously huge.
      if (35 / sizeRatio > 70) {
        var newHeight = Math.max(5, Math.round(70 * sizeRatio))
        barTemplate.firstChild.style.bottom = newHeight + 7 + "px"
        barTemplate.lastChild.style.height = newHeight + "px"
        barTemplate.style.fontSize = newHeight / 2 + "px"
        containerRect.height -= ((newHeight + 13) / 100) * barWidth
      } else {
        barTemplate.firstChild.style.bottom = ""
        barTemplate.lastChild.style.height = ""
        barTemplate.style.fontSize = ""
        containerRect.height -= 0.48 * barWidth
      }

      // choose the number of items per row, similar to grid view but upside down
      var maxBarHeight = containerRect.height - 0.06 * barWidth
      numPerRow = computeLayoutWidth(
        biggestCategoryCount,
        innerBarWidth,
        maxBarHeight,
        avgHeight
      )
      widthPerItem = innerBarWidth / numPerRow

      var prevRightLabel, curGridInfo, prevGridInfo, a, b

      // now go through and put all of the items in a location
      for (i = 0; i < allSortedItems.length; i++) {
        var horizOffset = barWidth * (i + 0.07)
        currentCategory = allSortedItems[i]
        totalItemCount = currentCategory.items.length

        // make the HTML elements that form the visual bar
        var bar = clone(barTemplate)
        bar.style.left = 100 * i + 1 + "px"
        var outerBar = bar.firstChild,
          innerBar = outerBar.firstChild,
          barLabel = outerBar.nextSibling
        backLayer.appendChild(bar)
        if (currentCategory.leftLabel) {
          // this graph bar has a label for its left and right edges.
          // we won't display its center label at all.
          var leftLabel = makeElement("div", "pivot_leftlabel", barLabel)
          addText(leftLabel, currentCategory.leftLabel)
          // now check whether the bar to our left wants to share our left label.
          if (prevRightLabel) {
            prevRightLabel.parentNode.removeChild(prevRightLabel)
            leftLabel.style.left = -leftLabel.offsetWidth / 2 + "px"
            leftLabel.style.textAlign = "center"
          } else {
            // we have less room for the left label, so make it narrower
            leftLabel.style.width = "50%"
          }
          var rightLabel = makeElement("div", "pivot_rightlabel", barLabel)
          addText(rightLabel, currentCategory.rightLabel)
          prevRightLabel = rightLabel
        } else {
          // this graph bar has a single, centered label
          addText(barLabel, currentCategory.label)
          prevRightLabel = undefined
        }

        // check for whether we need to center the row
        if (totalItemCount < numPerRow && totalItemCount > 0) {
          var adjustedWidth = (86 * totalItemCount) / numPerRow
          horizOffset =
            barWidth * i + (((100 - adjustedWidth) / 2) * barWidth) / 100
          adjustedWidth += 4
          // round to an even width, so it looks better
          adjustedWidth = Math.round(adjustedWidth / 2) * 2
          innerBar.style.width = adjustedWidth + "px"
          innerBar.style.left = (98 - adjustedWidth) / 2 + "px"
        }

        // place the items
        curGridInfo = placeGrid(
          containerRect.height,
          horizOffset,
          currentCategory.items,
          numPerRow,
          widthPerItem,
          widthPerItem * avgHeight,
          true
        )
        finalItemWidth = curGridInfo.itemWidth

        // keep track of global leftmost and rightmost items
        if (!topLeftItemInfo) {
          topLeftItemInfo = curGridInfo.topLeft
        }
        if (curGridInfo.rightmost) {
          rightmostItemInfo = curGridInfo.rightmost
        }

        // link up keyboard navigation to move between bars
        if (prevGridInfo) {
          a = prevGridInfo.lowest
          b = curGridInfo.topLeft
          if (a && b) {
            a.item.destination[a.index].down = b
            b.item.destination[b.index].up = a
          }
          if (a && !curGridInfo.lowest) {
            curGridInfo.lowest = a
          }
          a = prevGridInfo.rightmost
          if (a && b) {
            a.item.destination[a.index].right = b
            b.item.destination[b.index].left = a
          }
          if (a && !curGridInfo.rightmost) {
            curGridInfo.rightmost = a
          }
        }
        prevGridInfo = curGridInfo

        // set the height of the background bar
        innerBar.style.height =
          Math.round(
            (100 *
              Math.ceil(currentCategory.items.length / numPerRow) *
              widthPerItem *
              avgHeight) /
              barWidth +
              4
          ) + "px"

        // keep track of all bars we make
        var filterValues
        switch (facets[sortFacet].type) {
          case "String":
          case "Link":
            filterValues = currentCategory.values
            break
          case "Number":
          case "DateTime":
            filterValues = [
              {
                lowerBound: currentCategory.lowerBound,
                upperBound: currentCategory.upperBound,
                inclusive: currentCategory.inclusive,
              },
            ]
            break
          default:
            Seadragon2.Debug.warn(
              "Unrecognized category type: " + facets[sortFacet].type
            )
        }
        bars.push({
          bar: bar,
          values: filterValues,
          min: barWidth * i,
          name: currentCategory.label,
          count: totalItemCount,
        })
      }
    }

    // recalculate template sizes and scaling for the front layer
    if (currentTemplateLevel === -1 && finalItemWidth && templates.length) {
      setupFrontLayer(1)
    }

    // each of these squares should be able to zoom in up to 2x width of the container
    viewport.maxZoom = (containerSize.x / widthPerItem) * 2

    // move on to part 2
    rearrangePart2()
  }

  function rearrange() {
    // since we'll be animating a rearrange now, disable mouse tracking
    innerTracker.setTracking(false)

    // move the viewport to its home location
    viewport.goHome()

    // deselect anything that was selected
    selectedItem = undefined

    // clear item borders
    clearHighlights()

    // if we're already at home zoom the animation won't start, so we'll fake it
    // so that we can get a finish event.
    animating = true

    // if we had a mouseover title for a graph bar, get rid of it
    container.title = ""

    // if anybody else is midway through a rearrange, they'll have to wait for us to catch up
    self.clearListeners("animationfinish")

    // once it gets there, we'll start the rearrange.
    self.addListener("animationfinish", rearrangePart1)
  }

  // Helpers -- CORE

  function rectsOverlap(a, b) {
    return (
      b.x + b.width > a.x &&
      a.x + a.width > b.x &&
      b.y + b.height > a.y &&
      a.y + a.height > b.y
    )
  }

  // generate an ID that doesn't match any of the items in the collection
  var generateId = (function() {
    var nextId = 0
    return function() {
      var id
      do {
        id = (nextId++).toString()
      } while (hasOwnProperty.call(allItemsById, id))
      return id
    }
  })()

  function outlineItem(item, index, color, ctx, border, lineWidth) {
    var bounds, html
    if (item) {
      bounds = item.source[index]
      if (templates[currentTemplateLevel].type !== "html") {
        // draw it on canvas
        ctx.lineWidth = lineWidth
        ctx.strokeStyle = color
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)
      } else {
        // we have to set the border element as the parent of the hovered item
        html = item.html[currentTemplateLevel][index]
        html.appendChild(border)
        // adjust line width so it doesn't scale with content
        lineWidth = lineWidth * templateScale + "px"
        border.pvtop.style.height = border.pvright.style.width = border.pvbottom.style.height = border.pvleft.style.width = lineWidth
      }
    } else if (currentTemplateLevel !== -1) {
      // remove the border from its current location
      html = border.parentNode
      if (html) {
        html.removeChild(border)
      }
    }
  }

  function drawCanvasItem(ctx, x, y, width, height, item) {
    ctx.save()
    var result
    try {
      result = item.canvas[currentTemplateLevel](ctx, x, y, width, height, item)
    } catch (e) {
      // do nothing - it might have failed if a required facet isn't available or something
    }
    ctx.restore()
    return result
  }

  function updateOnce(arg, curTime) {
    var containerSize = viewport.getContainerSize()
    now = curTime || new Date().getTime()
    var id, item, i, sdimg, j

    if (delayedFunction) {
      var delayedFunctionCopy = delayedFunction
      delayedFunction = undefined
      delayedFunctionCopy()
    }

    // we'll need to know what kind of repaint to do, depending on the zoom level
    var currentTemplateType, usingSdimg, usingHtml, usingCanvas

    if (rearranging) {
      // the viewport can't move during a rearrange, so don't waste time
      // trying to update it. We will have to clear the canvas though, which is done here:
      self.redraw()

      currentTemplateType = templates[currentTemplateLevel].type
      usingSdimg =
        currentTemplateType === "sdimg" || currentTemplateType === "fakehtml"
      usingHtml = currentTemplateType === "html"
      usingCanvas =
        currentTemplateType === "canvas" ||
        currentTemplateType === "color" ||
        currentTemplateType === "img"

      // update current position of all items, draw them

      var progress,
        regress,
        source,
        dest,
        done = true,
        x,
        y,
        width,
        height,
        curSource,
        curDest,
        curStartTime,
        startTime

      // Note that redraws are only done at 100% size (home zoom), so we don't
      // have to bother with transforming coordinates: the item's coordinates
      // are actually its coordinates in the canvas!

      // first draw any items that are staying put
      if (usingSdimg || usingCanvas) {
        for (j = activeItemsArr.length - 1; j >= 0; j--) {
          item = activeItemsArr[j]
          id = item.id
          if (!hasOwnProperty.call(rearrangingItems, id)) {
            source = item.source
            // if the source property isn't set, it means this a newly added item that hasn't yet been
            // placed out of bounds. just ignore it.
            if (source) {
              sdimg = item.sdimg[currentTemplateLevel]
              for (i = source.length - 1; i >= 0; i--) {
                curSource = source[i]
                if (usingSdimg && sdimg) {
                  drawImage(
                    ctx,
                    sdimg,
                    curSource.x,
                    curSource.y,
                    curSource.width,
                    curSource.height
                  )
                } else {
                  drawCanvasItem(
                    ctx,
                    curSource.x,
                    curSource.y,
                    curSource.width,
                    curSource.height,
                    item
                  )
                }
              }
            }
          }
        }
      }

      // then draw the moving items (they'll go on top)
      for (j = rearrangingItemsArr.length - 1; j >= 0; j--) {
        item = rearrangingItemsArr[j]
        source = item.source
        dest = item.destination
        startTime = item.startTime
        sdimg = item.sdimg[currentTemplateLevel]
        for (i = source.length - 1; i >= 0; i--) {
          curSource = source[i]
          curDest = dest[i]
          curStartTime = startTime[i]
          progress =
            curStartTime === undefined
              ? 1
              : Math.max((now - curStartTime) / 700, 0)
          if (progress >= 1) {
            progress = 1
            regress = 0
          } else {
            done = false
            // transform to springy progress
            progress =
              progress < 0.5
                ? (Math.exp(progress * stiffness) - 1) * springConstant
                : 1 -
                  (Math.exp((1 - progress) * stiffness) - 1) * springConstant
            regress = 1 - progress
          }
          x = curSource.x * regress + curDest.x * progress
          y = curSource.y * regress + curDest.y * progress
          width = curSource.width * regress + curDest.width * progress
          height = curSource.height * regress + curDest.height * progress
          if (usingSdimg && sdimg) {
            drawImage(ctx, sdimg, x, y, width, height)
          } else if (usingHtml) {
            setTransform(
              item.html[currentTemplateLevel][i],
              new Seadragon2.Rect(x, y, width, height)
            )
          } else {
            // if usingCanvas, or fallback for sdimg that's not ready
            drawCanvasItem(ctx, x, y, width, height, item)
          }
        }
      }

      // we have to trigger an animationfinish event when we're done, so the next
      // phase of rearranging can get started
      if (done) {
        self.trigger("animationfinish", self)
      }
    } else {
      var animated = viewport.update()

      if (!animating && animated) {
        // we weren't animating, and now we did ==> animation start
        self.trigger("animationstart", self)
      }

      anythingChanged = anythingChanged || animated

      if (anythingChanged) {
        anythingChanged = false

        // since we're redrawing everything, we can re-detect what the mouse pointer is on
        hoveredItem = undefined
        var lastHoveredBar = hoveredBar
        hoveredBar = undefined

        var viewportBounds,
          targetViewportBounds,
          itemBounds,
          location,
          zoomPercent,
          centerItemBounds,
          currentBest = Infinity,
          distToCenter
        viewportBounds = self.getBounds(true)

        // choose the appropriate template level, since the zoom may have changed
        setupFrontLayer(viewport.getZoom(true), viewportBounds)

        currentTemplateType = templates[currentTemplateLevel].type
        usingSdimg =
          currentTemplateType === "sdimg" || currentTemplateType === "fakehtml"
        usingHtml = currentTemplateType === "html"
        usingCanvas =
          currentTemplateType === "canvas" ||
          currentTemplateType === "color" ||
          currentTemplateType === "img"

        // update the canvas transform and clear it
        self.redraw()

        targetViewportBounds = self.getBounds()
        zoomPercent = viewport.getZoomPercent()

        // update the UI slider
        self.trigger("zoom", zoomPercent)

        // find the mouse position in content coordinates
        var contentMousePosition
        if (lastMousePosition) {
          contentMousePosition = viewport.pointFromPixel(
            lastMousePosition.minus(
              new Seadragon2.Point(self.padding.left, self.padding.top)
            ),
            true
          )
        }

        if (!isGridView) {
          var barsCount
          if (lastMousePosition) {
            // check for whether the mouse is over a bar, and
            // save it in hoveredBar to prepare for possible clicks.
            barsCount = bars.length
            for (i = 0; i < barsCount; i++) {
              if (bars[i].min <= contentMousePosition.x) {
                hoveredBar = bars[i]
              } else {
                break
              }
            }
          }
          if (hoveredBar && !hoveredBar.count) {
            // there are no items in this bar, so don't filter by it
            hoveredBar = undefined
          }
          if (hoveredBar !== lastHoveredBar) {
            if (hoveredBar) {
              hoveredBar.bar.className = "pivot_bar pivot_highlight"
              container.title = hoveredBar.name
            } else {
              container.title = ""
            }
            if (lastHoveredBar) {
              lastHoveredBar.bar.className = "pivot_bar"
            }
          }
        }

        var wideEnough = (containerSize.x - rightRailWidth) * 0.5,
          tallEnough = containerSize.y * 0.5,
          itemBoundsArray,
          adjustedCenter = new Seadragon2.Point(-rightRailWidth / 2, 0),
          html

        centerItem = undefined
        zoomedIn = false

        // draw every item on the canvas
        for (j = activeItemsArr.length - 1; j >= 0; j--) {
          item = activeItemsArr[j]
          itemBoundsArray = item.source
          sdimg = item.sdimg[currentTemplateLevel]
          for (i = itemBoundsArray.length - 1; i >= 0; i--) {
            itemBounds = itemBoundsArray[i]
            if (itemBounds) {
              if (rectsOverlap(viewportBounds, itemBounds)) {
                // we have to draw every item, but we only need to bother with updating the ones
                // that will stay in the viewport after this movement.
                if (rectsOverlap(targetViewportBounds, itemBounds)) {
                  location = viewport.rectPixelsFromPoints(
                    itemBounds,
                    false,
                    true
                  )
                  if (usingSdimg && sdimg) {
                    sdimg.update(location)
                  }
                  if (
                    location.width > wideEnough ||
                    location.height > tallEnough
                  ) {
                    zoomedIn = true
                  }
                  distToCenter = location.getCenter().distanceTo(adjustedCenter)
                  if (distToCenter < currentBest) {
                    currentBest = distToCenter
                    centerItem = item
                    centerItemIndex = i
                    centerItemBounds = itemBounds
                  }
                }

                // redraw the image at its new location, if the item is represented as a sdimg.
                // if it's an HTML template, make sure it's in the DOM.
                if (usingSdimg && sdimg) {
                  anythingChanged =
                    !drawImage(
                      ctx,
                      sdimg,
                      itemBounds.x,
                      itemBounds.y,
                      itemBounds.width,
                      itemBounds.height
                    ) || anythingChanged
                } else if (usingHtml) {
                  html = item.html[currentTemplateLevel][i]
                  if (!html.pvInDom) {
                    addElementToFrontLayer(html)
                    html.pvInDom = true
                  }
                } else {
                  // if usingCanvas, or fallback for sdimg that's not ready
                  anythingChanged =
                    !drawCanvasItem(
                      ctx,
                      itemBounds.x,
                      itemBounds.y,
                      itemBounds.width,
                      itemBounds.height,
                      item
                    ) || anythingChanged
                }

                // check whether the mouse is over the current item
                if (
                  lastMousePosition &&
                  itemBounds.contains(contentMousePosition)
                ) {
                  hoveredItem = item
                  hoveredItemIndex = i
                }
              } else if (usingHtml) {
                // if we're using HTML templates, make sure this item isn't in the DOM for performance.
                html = item.html[currentTemplateLevel][i]
                if (html.pvInDom) {
                  frontLayer.removeChild(html)
                  html.pvInDom = false
                }
              }
            }
          }
        }

        // prepare to draw outlines
        var lineWidth = viewport.deltaPointsFromPixels(
          new Seadragon2.Point(3, 0)
        ).x // 3px regardless of zoom

        // draw an outline for hovered item
        outlineItem(
          hoveredItem,
          hoveredItemIndex,
          hoverBorderColor,
          ctx,
          domHoverBorder,
          lineWidth
        )

        // show or hide the details pane as necessary
        if (centerItem && zoomedIn) {
          if (detailsEnabled) {
            self.trigger("showDetails", centerItem, facets)
          } else {
            self.trigger("showInfoButton")
          }

          // relax the pan constraints so that we can see stuff on the far right side
          // without the details pane getting in the way.
          viewport.visibilityRatio =
            (containerSize.x - rightRailWidth) / containerSize.x
        } else {
          if (detailsEnabled) {
            self.trigger("hideDetails")
          } else {
            self.trigger("hideInfoButton")
          }
          viewport.visibilityRatio = 1
        }

        // draw an outline for selected item
        outlineItem(
          selectedItem,
          selectedItemIndex,
          selectedBorderColor,
          ctx,
          domSelectedBorder,
          lineWidth
        )
      }

      if (animating && !animated) {
        // we were animating, and now we're not anymore ==> animation finish
        self.trigger("animationfinish", self)
      }

      animating = animated
    }

    return true
  }

  // Mouse input handlers

  function onExit() {
    lastMousePosition = undefined
    anythingChanged = true
  }

  function onMove(e) {
    e = e || window.event
    lastMousePosition = Seadragon2.Mouse.getPosition(e).minus(
      Seadragon2.Element.getPosition(container)
    )
    anythingChanged = true
  }

  function onClick(tracker, id, position, quick, shift, isInputElmt) {
    var now = new Date().getTime(),
      itemBounds

    // We have to search the items to figure out which one is hovered, since touch events
    // don't start by telling us where the mouse is hovering.
    if (position) {
      // find the mouse position in content coordinates
      position = viewport.pointFromPixel(
        position.minus(
          new Seadragon2.Point(self.padding.left, self.padding.top)
        ),
        true
      )

      var i, j, itemBoundsArray, item

      if (!isGridView) {
        var barsCount
        // check for whether the mouse is over a bar, and
        // save it in hoveredBar to prepare for possible clicks.
        barsCount = bars.length
        for (i = 0; i < barsCount; i++) {
          if (bars[i].min <= position.x) {
            hoveredBar = bars[i]
          } else {
            break
          }
        }
        if (hoveredBar && !hoveredBar.count) {
          // there are no items in this bar, so don't filter by it
          hoveredBar = undefined
        }
      }

      // iterate every item on the canvas
      for (j = activeItemsArr.length - 1; j >= 0; j--) {
        item = activeItemsArr[j]
        itemBoundsArray = item.source
        for (i = itemBoundsArray.length - 1; i >= 0; i--) {
          itemBounds = itemBoundsArray[i]
          if (itemBounds) {
            // check whether the mouse is over the current item
            if (itemBounds.contains(position)) {
              hoveredItem = item
              hoveredItemIndex = i
            }
          }
        }
      }
    }

    if (!isInputElmt && quick && now - lastClickTime > doubleClickThreshold) {
      if (
        hoveredItem &&
        (selectedItem !== hoveredItem || selectedItemIndex !== hoveredItemIndex)
      ) {
        // select the currently hovered item
        selectedItem = hoveredItem
        selectedItemIndex = hoveredItemIndex

        // zoom to fit the hovered item. this overrides the default
        // zoom that would happen if you click on the background.
        itemBounds = hoveredItem.source[hoveredItemIndex]
        var containerSize = viewport.getContainerSize(),
          containerWidth = containerSize.x,
          containerHeight = containerSize.y,
          widthPadding,
          innerContainerWidth = detailsEnabled
            ? containerWidth - rightRailWidth
            : containerWidth

        // adjust the itemBounds to leave extra room for the right rail
        widthPadding = Math.max(
          ((((innerContainerWidth / itemBounds.width) * itemBounds.height) /
            containerHeight) *
            1.4 -
            1) /
            2,
          0.2
        )
        itemBounds = new Seadragon2.Rect(
          itemBounds.x - itemBounds.width * widthPadding,
          itemBounds.y,
          (itemBounds.width * (1 + 2 * widthPadding) * containerWidth) /
            innerContainerWidth,
          itemBounds.height
        )

        // move there
        viewport.fitBounds(itemBounds)
      } else if (!hoveredItem && hoveredBar) {
        // add a filter
        self.trigger("filterrequest", {
          facet: sortFacet,
          values: hoveredBar.values,
          type: facets[sortFacet].type,
        })
      } else {
        // to mimic the functionality of real PivotViewer, most clicks go home
        selectedItem = undefined
        viewport.goHome()
      }

      // only if we didn't ignore this click, reset the double-click timer
      lastClickTime = now
    }
  }

  function onPress() {
    // now that the user is interacting with the canvas, we'll try to catch their keystrokes
    inputElmt.focus()
  }

  function onRelease() {
    // change the cursor back to default
    var documentElement = document.documentElement
    dragCursorSet = false
    documentElement.className = documentElement.className.replace(
      " pivot_move",
      ""
    )
  }

  function onDrag() {
    // the Viewer already changes the mouse cursor on mouse down, but we need
    // a more global change that will override styles we've set elsewhere on
    // the page, such as the filter pane which has the default cursor.
    // This sets the cursor for not only the document element, but all of its children.
    if (!dragCursorSet) {
      dragCursorSet = true
      document.documentElement.className += " pivot_move"
    }

    // since the user is moving the viewport, we no longer have a selected item
    selectedItem = undefined
  }

  function onScroll() {
    // since the user is moving the viewport, we no longer have a selected item
    selectedItem = undefined

    // now that the user is interacting with the canvas, we'll try to catch their keystrokes
    inputElmt.focus()
  }

  function onKeyDown(e) {
    var keyCode = e.keyCode,
      location,
      newItemInfo
    if (keyCode >= 37 && keyCode <= 40) {
      if (!viewport.getZoomPercent()) {
        // from home zoom, right/down goes to first item and left/up goes to last item
        switch (keyCode) {
          case 37:
          case 38:
            newItemInfo = rightmostItemInfo
            break
          case 39:
          case 40:
            newItemInfo = topLeftItemInfo
            break
        }
      } else {
        // from any other zoom, base movement on the item closest to the center of the viewer
        location = centerItem.source[centerItemIndex]
        switch (keyCode) {
          case 37:
            newItemInfo = location.left
            break
          case 38:
            newItemInfo = location.up
            break
          case 39:
            newItemInfo = location.right
            break
          case 40:
            newItemInfo = location.down
            break
        }
      }
      if (newItemInfo) {
        // center the view on the new item, just like we do for a click.
        // if we're already moving there (due to fast repeated key-presses), don't bother.
        if (
          selectedItem !== newItemInfo.item ||
          selectedItemIndex !== newItemInfo.index
        ) {
          hoveredItem = newItemInfo.item
          hoveredItemIndex = newItemInfo.index
          onClick(undefined, 0, undefined, true)
        }
      }
      if (e.preventDefault) {
        e.preventDefault()
      }
    }
  }

  // the Viewer already resizes the Viewport's notion of container size,
  // but it doesn't know that our content will also resize to fit into the new space.
  // here, we resize the viewport's content dimensions to match its container size.
  function onResize(width, height) {
    // delay resizing the canvas until the beginning of the next repaint, to reduce flicker
    delayFunction(function() {
      canvas.width = width
      canvas.height = height
    })
    viewport.resizeContent(viewport.getContainerSize())
    viewport.update()
    rearrange()
  }

  // Helpers -- UI

  // Make a div with four other divs in it, positioned around the edges. The point is that
  // the resulting element can be used as an overlay border for HTML content. I decided this
  // was a reasonable solution given the following constraints:
  // 1) Keep the common case cheap: We don't want an extra level of DOM for every element
  // 2) Act like PivotViewer: Its item borders are drawn inside the edges of the items' space.
  // 3) Interactability: We can't slap a big transparent div in front of other HTML content.
  function buildFakeBorder(className) {
    var result = makeElement("div"),
      cur,
      style,
      directions = ["top", "right", "bottom", "left"],
      i,
      j
    for (i = 0; i < 4; i++) {
      cur = result["pv" + directions[i]] = makeElement("div", className, result)
      style = cur.style
      for (j = 0; j < 4; j++) {
        if (i !== j) {
          style[directions[j]] = "-1px"
        }
      }
    }
    return result
  }

  function initialize() {
    // set up the HTML zoom layers
    backZoomContainer = new Seadragon2.HTMLZoomContainer(backLayer)
    frontZoomContainer = new Seadragon2.HTMLZoomContainer(frontLayer)

    // inherit from Viewer
    Seadragon2.Viewer.call(self, container, {
      constrainDuringPan: true,
      ignoreChange: true,
      viewportOptions: {
        minZoom: 1,
        visibilityRatio: 1,
        selfUpdating: false,
      },
      padding: {
        top: 5,
        right: 5,
        bottom: 5,
        left: leftRailWidth + 5,
      },
      dragCursor: "",
      zoomContainers: [
        backZoomContainer,
        new Seadragon2.CanvasZoomContainer(canvas),
        frontZoomContainer,
      ],
    })

    // now that we built zoom containers inside the HTML layers, update our references
    backLayer = backLayer.firstChild
    frontLayer = frontLayer.firstChild

    // and save some references to that Viewer's stuff
    innerTracker = self.tracker
    viewport = self.viewport

    // replace the default click handler, since we want to do other stuff
    innerTracker.clearListeners("click")

    // we need a bit of mouse tracking that the viewer doesn't provide already
    innerTracker.addListener("exit", onExit)
    Seadragon2.Event.add(container, "mousemove", onMove, false)
    innerTracker.addListener("click", onClick)
    innerTracker.addListener("press", onPress)
    innerTracker.addListener("release", onRelease)
    innerTracker.addListener("drag", onDrag)
    innerTracker.addListener("scroll", onScroll)

    // and keyboard tracking for navigating with arrows
    inputElmt.addEventListener("keydown", onKeyDown, false)

    // add a listener to update stuff if the viewer size changes onscreen
    self.addListener("resize", onResize)

    // Rather than trying to figure out when we can stop drawing
    // or change frame rate, I'll just use the global timer.
    Seadragon2.Timer.register(updateOnce)

    // build some HTML as a template for each graph bar
    barTemplate = makeElement("div", "pivot_bar")
    var outerBar
    outerBar = makeElement("div", "pivot_outerbar", barTemplate)
    makeElement("div", "pivot_innerbar", outerBar)
    makeElement("div", "pivot_barlabel", barTemplate)

    // make HTML overlay elements for the boxes that overlay selected or hovered items
    domHoverBorder = buildFakeBorder("pivot_hoverborder")
    domSelectedBorder = buildFakeBorder("pivot_selectedborder")

    // temporarily add them to the DOM so we can measure their color
    frontLayer.appendChild(domHoverBorder)
    frontLayer.appendChild(domSelectedBorder)
    hoverBorderColor = Seadragon2.Element.getStyle(domHoverBorder.pvtop)
      .backgroundColor
    selectedBorderColor = Seadragon2.Element.getStyle(domSelectedBorder.pvtop)
      .backgroundColor
    frontLayer.removeChild(domHoverBorder)
    frontLayer.removeChild(domSelectedBorder)
  }

  // Methods -- UI

  /**
   * Zoom the view, toward its center, to the given percentage zoom (0 is minimum, 100 is maximum).
   * @method zoomToPercent
   * @param percent {number} The target zoom level
   */
  this.zoomToPercent = function(percent) {
    viewport.zoomToPercent(percent)
    viewport.applyConstraints()
  }

  /**
   * Move the viewport to center on the item left of the center item. Wraps around at edges.
   * @method moveLeft
   */
  this.moveLeft = function() {
    // same as pressing left key
    onKeyDown({ keyCode: 37 })
  }

  /**
   * Move the viewport to center on the item right of the center item. Wraps around at edges.
   * @method moveRight
   */
  this.moveRight = function() {
    // same as pressing right key
    onKeyDown({ keyCode: 39 })
  }

  /**
   * Center the item with the given ID as if it had been clicked.
   * @method setCenterItem
   * @param id {string} The ID of the item to center
   */
  this.setCenterItem = function(id) {
    if (!hasOwnProperty.call(allItemsById, id)) {
      throw "setCenterItem: No matching ID found: " + id
    }
    if (!innerTracker.isTracking()) {
      throw "setCenterItem: Can't execute during rearrange."
    }
    if (!hasOwnProperty.call(activeItems, id)) {
      throw "setCenterItem: Item is currently not filtered in."
    }
    var item = allItemsById[id]
    if (item !== selectedItem) {
      hoveredItem = item
      hoveredItemIndex = 0
      onClick(undefined, 0, undefined, true)
    }
  }

  /**
   * Collapse the details pane and show the info button instead.
   * @method collapseDetails
   */
  this.collapseDetails = function() {
    detailsEnabled = false
    if (selectedItem) {
      // move the viewport so the selected item stays centered
      hoveredItem = selectedItem
      hoveredItemIndex = selectedItemIndex
      selectedItem = undefined
      onClick(undefined, 0, undefined, true)
    }
    self.trigger("hideDetails")
    self.trigger("showInfoButton")
  }

  /**
   * Show the details pane and hide the info button.
   * @method expandDetails
   */
  this.expandDetails = function() {
    detailsEnabled = true
    if (selectedItem) {
      // move the viewport so the selected item stays centered
      hoveredItem = selectedItem
      hoveredItemIndex = selectedItemIndex
      selectedItem = undefined
      onClick(undefined, 0, undefined, true)
    }
    self.trigger("hideInfoButton")
    self.trigger("showDetails", centerItem, facets)
  }

  // Methods -- SORTING & FILTERING

  /**
   * Sort the collection by the selected facet. The collection will immediately begin rearranging.
   * @method sortBy
   * @param facetName {string} the name of the facet category to sort by
   */
  this.sortBy = function(facetName) {
    sortFacet = facetName
    rearrange()
  }

  /**
   * Go to grid view, if the viewer is currently in graph view. Otherwise, do nothing.
   * @method gridView
   */
  this.gridView = function() {
    if (!isGridView) {
      isGridView = true
      rearrange()
      return true
    }
    return false
  }

  /**
   * Go to graph view, if the viewer is currently in grid view. Otherwise, do nothing.
   * @method graphView
   */
  this.graphView = function() {
    if (isGridView) {
      isGridView = false
      rearrange()
      return true
    }
    return false
  }

  /**
   * Start rearranging the viewer based on the currently selected filters.
   * @method filter
   */
  this.filter = function() {
    rearrange()
  }

  /**
   * Add a new filter to the viewer. Do not immediately start rearranging.
   * @method addFilter
   * @param filter {function} The filtering function. It takes one argument, a collection item,
   * and returns true if the item is allowed and false if the item is filtered out.
   */
  this.addFilter = function(filter) {
    if (typeof filter === "function") {
      filters.push(filter)
    }
  }

  /**
   * Remove a filter from the viewer. Do not immediately start rearranging.
   * @method removeFilter
   * @param filter {function} The filtering function, which was previously added to the viewer
   * by a call to addFilter.
   */
  this.removeFilter = function(filter) {
    var index = filters.indexOf(filter)
    if (index !== -1) {
      filters.splice(index, 1)
    }
  }

  /**
   * Clear all filters from the viewer. Do not immediately start rearranging.
   * @method clearFilters
   */
  this.clearFilters = function() {
    filters = []
  }

  // Methods -- CONTENT

  /**
   * Set new facet categories for the collection. This method can only be called when the
   * viewer is empty, which means before any calls to addItems or after the "itemsCleared"
   * event has been triggered in response to a clearItems call.
   * @method setFacets
   * @param newFacets {object} The new facet categories. The property names in this object
   * are the names of the categories, and the values of the properties are objects describing
   * the categories. Each category description should have the following properties:
   * <dl>
   * <dt>type</dt><dd>string - The type of facet category. Valid types are "String",
   * "LongString" (which gets treated like String), "Number", "DateTime", and "Link".</dd>
   * <dt>isFilterVisible</dt><dd>bool - Whether the facet shows up in the filter selection
   * pane and the sort order drop-down</dd>
   * <dt>isWordWheelVisible</dt><dd>bool - Whether the facet category will be accessible via
   * the search box</dd>
   * <dt>isMetaDataVisible</dt><dd>bool - Whether the facet shows up in the details pane</dd>
   * <dt>orders</dt><dd>optional Array - Allows you to set custom sort orders for String
   * facets other than the default alphabetical and most-common-first orders. Each element
   * in this array must have a "name" string property and an "order" array of strings, which
   * contains all possible facet values in the desired order.</dd>
   * </dl>
   */
  this.setFacets = function(newFacets) {
    if (items.length) {
      throw "You must set facet categories before adding items."
    }

    // the old filters probably won't make any sense anymore, and
    // the view portion forgets them automatically.
    filters = []

    facets = newFacets

    // look through the newly added facets and set up comparators
    // for any facets that define a custom sort order
    var facetName, facetData, orders
    for (facetName in facets) {
      if (hasOwnProperty.call(facets, facetName)) {
        facetData = facets[facetName]
        orders = facetData.orders
        if (orders && orders.length) {
          // make a new variable scope so we can bind by value
          ;(function() {
            var orderArray = orders[0].order,
              orderMap = {}
            orderArray.forEach(function(value, index) {
              orderMap[value] = index
            })
            facetData.comparator = function(a, b) {
              var isAOrdered = hasOwnProperty.call(orderMap, a),
                isBOrdered = hasOwnProperty.call(orderMap, b)
              return isAOrdered
                ? isBOrdered
                  ? orderMap[a] - orderMap[b]
                  : -1
                : isBOrdered
                ? 1
                : a === b
                ? 0
                : a > b
                ? 1
                : -1
            }
          })()
        }
      }
    }

    // fire an event so that the UI components can update themselves
    self.trigger("hideDetails")
    self.trigger("hideInfoButton")
    self.trigger("facetsSet", facets)
  }

  // Helpers -- TEMPLATING

  function pollForContent() {
    var index
    for (index in contentPollingEndpoints) {
      if (hasOwnProperty.call(contentPollingEndpoints, index)) {
        var endpoint = contentPollingEndpoints[index]

        ;(function() {
          var indexCopy = parseInt(index, 10),
            level = endpoint.level,
            itemArray = endpoint.items

          // TODO make sure that we don't set the sdimgs multiple times for a single level,
          // in case the network requests overlapped. We must however leave the option to
          // make the level anew if it actually needs it because the items have changed.
          Seadragon2.Xml.fetch(
            endpoint.url,
            function() {
              // success callback
              var result
              try {
                result = JSON.parse(this.responseText)
              } catch (e) {
                Seadragon2.Debug.warn(
                  "Error in parsing JSON from content endpoint"
                )
                return
              }

              // check: is the DZC finished?
              if (result.ready) {
                // we no longer need to poll for this content
                delete contentPollingEndpoints[indexCopy]
                contentPollingCount--

                // make sure we update the view now that there is new content
                if (level === currentTemplateLevel.toString()) {
                  anythingChanged = true
                }

                // calculate some properties that we'll need for setting up tile sources
                var dzcInfo = result.dzi
                var dzcUrl = dzcInfo.url
                dzcUrl = dzcUrl.substr(0, dzcUrl.length - 4) + "_files/"
                var width = dzcInfo.width
                var height = dzcInfo.height
                var tileSize = dzcInfo.tileSize
                var format = dzcInfo.tileFormat

                var maxLevel = Math.min(
                  Math.log(tileSize) / Math.LN2,
                  Math.ceil(Math.log(Math.max(width, height)) / Math.LN2)
                )

                // Note that the server does actually create a .dzc file for this collection.
                // However, there are two problems with it:
                // 1. I'm not sure if you can set Access-Control-Allow-Origin for Azure blob storage.
                // 2. It's needlessly big and we already know all of the information it will contain.
                // Given those issues, it's far easier and faster to just build the DzcTileSource objects
                // here, rather than referencing the DZC file by URL.

                // create new sdimgs at this level for each item
                itemArray.forEach(function(item, itemIndex) {
                  var sdimg = (item.sdimg[level] = new Seadragon2.Image(
                    sdimgOpts
                  ))
                  sdimg.src = new Seadragon2.DzcTileSource(
                    width,
                    height,
                    tileSize,
                    maxLevel,
                    itemIndex,
                    dzcUrl,
                    format,
                    itemIndex
                  )
                  sdimg.update()
                })
              }

              // check: did the server fail?
              if (result.failed) {
                // no point in polling for it any more
                delete contentPollingEndpoints[indexCopy]
                contentPollingCount--
              }
            },
            function() {
              // failure callback
              Seadragon2.Debug.warn(
                "Received failure code from server-side renderer"
              )
            }
          )
        })()
      }
    }

    // register to try again after a bit
    if (contentPollingCount) {
      delayFunction(pollForContent, 60)
    }
  }

  function renderOnServer() {
    var serverName,
      index,
      itemsArray,
      jsonObject,
      jsonString,
      reduce = [].reduce,
      template

    // build the object that we'll use for the POST request
    jsonObject = {
      href: location.href,
      // we have to upload all current styles to the server so it renders correctly
      style: reduce.call(
        document.styleSheets,
        function(prev, styleSheet) {
          return (
            prev +
            reduce.call(
              styleSheet.cssRules,
              function(prev, styleRule) {
                return prev + styleRule.cssText
              },
              ""
            )
          )
        },
        ""
      ),
    }

    // iterate over the servers (usually there will only be one).
    // for each, upload the list of items that we'll render on it.
    for (index in serverSideItems) {
      if (hasOwnProperty.call(serverSideItems, index)) {
        itemsArray = serverSideItems[index]
        template = templates[index]
        serverName = template.renderer + "pivot/"
        jsonObject.width = template.width
        jsonObject.height = template.height || template.width

        // we don't want to upload the full representation of each item, just its
        // HTML template for this level.
        jsonObject.items = itemsArray.map(function(item) {
          return item.html[index][0].innerHTML
        })

        // generate a JSON string that we can upload
        jsonString = JSON.stringify(jsonObject)

        // compress it and base64-encode the result
        jsonString = lzwEncode(jsonString)

        // introduce a new scope so we can use temporary variables in the callbacks
        ;(function() {
          var indexCopy = index,
            rendererCopy = template.renderer,
            itemsArrayCopy = itemsArray

          // POSTing with mime type application/json requires pre-flighting the request.
          // it should be fewer total round trips if we stick with default text/plain.
          Seadragon2.Xml.fetch(
            serverName,
            function() {
              // success handler
              var result
              try {
                result = JSON.parse(this.responseText)
              } catch (e) {
                Seadragon2.Debug.warn(
                  "Failed to parse JSON response from server."
                )
                return
              }

              // now that we know the ID of the generated content, we'll have to poll the content
              // endpoint for its status until it is finished.
              contentPollingEndpoints[renderRequestCount++] = {
                level: indexCopy,
                url: rendererCopy + "content/" + result.id,
                items: itemsArrayCopy,
              }
              contentPollingCount++
              if (contentPollingCount === 1) {
                // ideally this would be a one second delay, but in a big collection it
                // is probably slower. if we need better precision, we could
                // use setTimeout instead.
                delayFunction(pollForContent, 60)
              }
            },
            function() {
              // failure handler
              Seadragon2.Debug.warn(
                "Failed to post collection data. Status text: " +
                  this.statusText +
                  "; response: " +
                  this.responseText
              )
            },
            jsonString
          )
        })()
      }
    }

    // clear temporary state now that the items have been posted
    serverSideItems = {}
    serverRenderTimeout = undefined
  }

  // Create the template levels for a new item, or update template levels for
  // an existing item. Note that any levels rendered server-side have "one-time"
  // data bindings, meaning changes to properties will be ignored for those levels.
  function updateTemplate(item) {
    var oldHtmlArray = item.html, // don't overwrite if already existed!
      htmlArray = (item.html = []),
      oldCanvasArray = item.canvas,
      canvasArray = (item.canvas = []),
      oldSdimgArray = item.sdimg,
      sdimgArray = (item.sdimg = []),
      renderer,
      serverItemsArray,
      isNewItem = !oldHtmlArray

    // template level -1 is used for if no templates were specified
    // (the old CXML case).
    if (oldSdimgArray) {
      sdimgArray[-1] = oldSdimgArray[-1]
    }
    templates.forEach(function(template, index) {
      switch (template.type) {
        case "canvas":
          htmlArray.push([])
          canvasArray.push(template.func)
          sdimgArray.push(undefined)
          break
        case "img":
        case "color":
          htmlArray.push([])
          canvasArray.push(makeTemplate(template, item))
          sdimgArray.push(undefined)
          break
        case "sdimg":
          htmlArray.push([])
          canvasArray.push(undefined)
          sdimgArray.push(sdimgArray[-1])
          break
        case "fakehtml":
          if (isNewItem) {
            renderer = template.renderer

            // push this item to the server for rendering as part of a dynamic DZC
            serverItemsArray = serverSideItems[index] =
              serverSideItems[index] || []
            serverItemsArray.push(item)

            // get ready to send a request for server-side rendering
            // (not right away, because we want to accumulate all items before
            // launching the request)
            if (serverRenderTimeout === undefined) {
              serverRenderTimeout = true
              delayFunction(renderOnServer)
            }

            htmlArray.push([makeTemplate(template, item)])

            // we have to have fallback content because it takes a long time to render server-side.
            // it would ruin our perf to have the fallback content be actual html, so we'll draw
            // something on the canvas. if nothing else was specified, just draw a gray box to fill
            // the space.
            canvasArray.push(
              makeTemplate(
                template.fallback || {
                  type: "color",
                  template: "gray",
                },
                item
              )
            )

            sdimgArray.push(undefined)
          } else {
            // this binding already happened once and we're not redoing it.
            // just copy the results over to the new templates.
            htmlArray.push(oldHtmlArray[index])
            canvasArray.push(oldCanvasArray[index])
            sdimgArray.push(oldSdimgArray[index])
          }
          break
        case "html":
          if (oldHtmlArray) {
            // there were already HTML representations of this item. since they might
            // be onscreen and likely have other useful position info and such on them,
            // we'll reuse the container element but replace its inner HTML.
            // In rare cases there might be multiple copies of the element's HTML because
            // it is present in multiple graph bars. TODO optimize templating in this case.
            htmlArray.push(oldHtmlArray[index])
            oldHtmlArray[index].forEach(function(htmlElement) {
              makeTemplate(template, item, htmlElement)
            })
          } else {
            htmlArray.push([makeTemplate(template, item)])
          }
          canvasArray.push(undefined)
          sdimgArray.push(undefined)
          break
        default:
          Seadragon2.Debug.warn("updateTemplate: unrecognized template type")
      }
    })

    // find and set the aspect ratio for the item. we assume that the aspect ratio
    // of all template levels will match (or at least approximate) the ratio of
    // the top level.
    if (templates.length) {
      var biggestTemplate = templates[templates.length - 1]
      item.normHeight =
        (biggestTemplate.height || biggestTemplate.width) /
        biggestTemplate.width
    }
  }

  // Methods -- CONTENT, cont'd

  /**
   * Add an array of new items to the viewer, or modify existing items. You can mix new items with
   * existing items. An existing item is recognized by whether its id property matches the id of
   * any items already in the viewer.
   * @method addItems
   * @param newItems {Array} The items to add. Each item is an object, which can have any
   * combination of the following properties (all are optional):
   * <dl>
   * <dt>id</dt><dd>string - The unique identifier for the item. If you don't provide it, one will
   * be generated automatically. You should provide IDs either for all of your items or for none of
   * them, to avoid conflicting with auto-generated IDs.</dd>
   * <dt>name</dt><dd>string - The name of the item</dd>
   * <dt>description</dt><dd>string - Extra text information about the item</dd>
   * <dt>href</dt><dd>string - The URL associated with the item</dd>
   * <dt>img</dt><dd>string - The URL of the DZI or DZC image for the item</dd>
   * <dt>facets</dt><dd>object - Facet data. Property names are facet categories; property values
   * are arrays of values for that facet (strings, numbers, or dates, depending on the facet type).
   * Even if there is only one value for a particular facet, it must be in an array.
   * </dl>
   */
  this.addItems = function(newItems) {
    // if we're busy clearing a previous collection, wait until it's done before adding new items.
    // this helps protect against cases where IDs in the new collection collide with the old collection
    // and produce unintended results.
    if (
      !items.length &&
      (activeItemsArr.length || rearrangingItemsArr.length)
    ) {
      // delay it
      delayFunction(function() {
        self.addItems(newItems)
      })
      return
    }

    var waitingItems = 1
    var actuallyNewItems = [] // an array of items that were added, not updated
    function onLoad() {
      waitingItems--
      if (!waitingItems) {
        // all items have loaded, add them to the view
        items = items.concat(actuallyNewItems)

        // set up templates for the new items, if necessary.
        // note that existing items may need their templates updated, since
        // their facets/descriptions/names may have changed.
        newItems.forEach(updateTemplate)

        // filter in all items and sort by the default facet.
        // TODO it should be possible to skip this step in cases where no items
        // were moved into or out of the current filters, and the current sort
        // order didn't change.
        self.filter()
      }
    }
    newItems.forEach(function(item) {
      // like anything else, we might have different sdimg representations of different zoom levels
      var sdimgs = (item.sdimg = item.sdimg || []),
        sdimg
      if (item.img) {
        sdimg = sdimgs[-1] = sdimgs[-1] || new Seadragon2.Image(sdimgOpts)
        sdimg.src = item.img
        sdimg.update()
        if (!sdimg.state) {
          // the image hasn't yet loaded; we must wait for it
          waitingItems++
          sdimg.addEventListener("load", onLoad, false)
          // TODO sdimg should also provide onerror, and we should respond to it.
        }
      }

      // check whether this item is new or updated
      var id = item.id
      // if an ID wasn't provided, we must assign one
      if (!id && typeof id !== "number") {
        id = item.id = generateId()
      }
      // likewise, we should check that the other item properties exist
      if (!item.name) {
        item.name = ""
      }
      if (!item.description) {
        item.description = ""
      }
      if (!item.href) {
        item.href = ""
      }
      if (!item.facets) {
        item.facets = {}
      }
      if (!hasOwnProperty.call(allItemsById, id)) {
        allItemsById[id] = item
        actuallyNewItems.push(item)
      }

      // refresh the details pane if necessary
      if (centerItem === item && zoomedIn && detailsEnabled) {
        self.trigger("hideDetails")
        self.trigger("showDetails", item, facets)
      }
    })
    // now check to see whether we can immediately add items
    onLoad()
  }

  this.setActiveItems = items => {
    this.addItems(items)

    // clear active items
    _activeItems = {}
    _activeItemsArr = []

    items.forEach(item => {
      _activeItems[item.id] = item
      _activeItemsArr.push(item)
    })

    this.filter()
  }

  this.setActiveGroups = groups => {
    groups.forEach(group => {
      const { items } = group
      this.addItems(items)
    })

    // clear active items
    _activeItems = {}
    _activeItemsArr = []
    _activeGroups = groups

    groups.forEach(group => {
      const { items } = group
      items.forEach(item => {
        _activeItems[item.id] = item
        _activeItemsArr.push(item)
      })
    })

    this.graphView()
  }

  /**
   * Set new templates for the viewer. Templates specify how items should be rendered in
   * the viewer, and can vary by zoom level. At any zoom level, the viewer will use the
   * smallest available template that is larger than the current item size, or the biggest
   * template if the current item size is larger than all templates. All templates should
   * have the same aspect ratio. This method can only be called when the viewer is empty,
   * which means before any calls to addItems or after the "itemsCleared" event has been
   * triggered in response to a clearItems call.
   * @method setTemplates
   * @param newTemplates {Array} The new templates. Each object in the array must have the
   * following properties:
   * <dl>
   * <dt>type</dt><dd>string - Either "html", "canvas", "sdimg", "color", or "img"</dd>
   * <dt>width</dt><dd>number - The template width in pixels</dd>
   * <dt>height</dt><dd>number - The template height in pixels</dd>
   * <dt>template</dt><dd>string or function - The template that specifies how to generate
   * visuals for an item in the collection at this level. To learn about specifying
   * templates, read the <a href="../../app/pivot/quickstart.html">developer's guide</a>.</dd>
   * </dl>
   */
  this.setTemplates = function(newTemplates) {
    // we disallow changing the template types while there are items in the view
    if (items.length || activeItemsArr.length || rearrangingItemsArr.length) {
      throw "You must set templates before adding items!"
    }

    // note that this does modify the input array
    templates = newTemplates.sort(function(a, b) {
      return a.width - b.width
    })
    templates[-1] = { type: "sdimg" }

    // set up templates that draw directly on canvas
    templates.forEach(function(template) {
      if (template.type === "canvas") {
        template.func = makeTemplate(template)
      }
      if (template.type === "html" && template.renderer) {
        // internally, it's much easier to treat local HTML and
        // server-rendered HTML as two separate types.
        template.type = "fakehtml"
      }
    })

    // reset current level
    currentTemplateLevel = -1
  }

  /**
   * Remove all items from the collection.
   * @method clearItems
   */
  this.clearItems = function() {
    items = []
    allItemsById = {}

    self.filter()
  }

  /**
   * Look up an item by its unique identifier.
   * @method getItemById
   * @param id {string} the ID to find
   * @return {object} the object representing the item, in the format used by addItems
   */
  this.getItemById = function(id) {
    return allItemsById[id]
  }

  /**
   * Set the collection title.
   * @method setTitle
   * @param title {string} the new title
   */
  this.setTitle = function(title) {
    // just raise an event so the UI can update
    self.trigger("titleChange", title)
  }

  /**
   * Set legal info for the collection.
   * @method setCopyright
   * @param legalInfo {object} Contains two properties:
   * <dl>
   * <dt>name</dt><dd>string - The name to display</dd>
   * <dt>href</dt><dd>string - The URL for more information</dd>
   * </dl>
   */
  this.setCopyright = function(legalInfo) {
    // fire an event so the UI can update
    self.trigger("copyright", legalInfo)
  }

  /**
   * Get all items that are in based on all current filters except
   * the provided one. This is important for generating the counts
   * in the Pivot view's left rail.
   * @method runFiltersWithout
   * @param filter {function} the filter to not apply
   * @return {array} All items filtered in, excluding the given filter
   */
  this.runFiltersWithout = function(filter) {
    this.removeFilter(filter)
    var result = items.filter(function(item) {
      return filters.every(function(filter2) {
        return filter2(item)
      })
    })
    this.addFilter(filter)
    return result
  }

  function countResult(results, str) {
    if (hasOwnProperty.call(results, str)) {
      results[str]++
    } else {
      results[str] = 1
    }
  }

  /**
   * Look for all facet values containing the given search term.
   * If the splitResults argument is true, this function
   * returns an object with two properties: front, which contains
   * matches where the search string matches the beginning of the
   * facet value, and rest, which contains other matches.
   * Otherwise, it returns only one object, with all matches.
   * @method runSearch
   * @param searchTerm {string} The string to find
   * @param splitResults {bool} Whether to split the results into two sets:
   * those where the beginning of the string matches, and those where any
   * substring matches.
   * @return {object} The results of the search. Property names are the
   * matching strings; property values are the number of matches with that string.
   */
  this.runSearch = function(searchTerm, splitResults) {
    var frontResults, restResults, result
    if (splitResults) {
      frontResults = {}
      restResults = {}
      result = {
        front: frontResults,
        rest: restResults,
      }
    } else {
      frontResults = restResults = {}
    }
    searchTerm = searchTerm.toLowerCase()
    function checkResult(value) {
      // deal with Link type
      value = value.content || value
      // deal with Number and Date types
      if (typeof value === "number") {
        value = PivotNumber_format(value)
      } else if (value instanceof Date) {
        value = value.toLocaleDateString() + " " + value.toLocaleTimeString()
      }
      var match = value.toLowerCase().indexOf(searchTerm)
      if (match === 0) {
        countResult(frontResults, value)
      } else if (match > 0) {
        countResult(restResults, value)
      }
    }
    if (searchTerm) {
      items.forEach(function(item) {
        var facets = item.facets,
          facetName
        for (facetName in facets) {
          if (hasOwnProperty.call(facets, facetName)) {
            facets[facetName].forEach(checkResult)
          }
        }
        checkResult(item.name)
      })
    }
    return result
  }

  // Constructor
  initialize()
})
