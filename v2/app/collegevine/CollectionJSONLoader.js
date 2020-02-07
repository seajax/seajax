/*global Seadragon2, Pivot, addText*/

/**
 * A class that can load CXML data into an existing PivotViewer.
 * @class CxmlLoader
 * @static
 * @namespace Pivot
 */
var CollectionJSONLoader = (Pivot.CollectionJSONLoader = {
  /**
   * Load the CXML file from the given URL and place the content that
   * it describes into the given PivotViewer.
   * @method load
   * @static
   * @param {Pivot.PivotViewer} viewer The viewer
   * @param {string} url The URL of the CXML file to load
   */
  load: function(viewer, url) {
    return new Promise((resolve, reject) => {
      var pivotNS =
        "http://schemas.microsoft.com/livelabs/pivot/collection/2009"

      var imgBase,
        facets = {}

      // set up the callback functions

      function onFailure() {
        // failure callback for fetching XML
        Seadragon2.Debug.error("Failed to fetch CXML: " + url)
      }

      function onSuccess() {
        // success callback for fetching XML
        var xml = this.responseXML || Seadragon2.Xml.parse(this.responseText)
        if (!xml) {
          Seadragon2.Debug.error("Failed to parse CXML: " + url)
          return
        }

        var collection,
          secondLevel,
          cur,
          i,
          n,
          facet,
          item,
          thirdLevel,
          items = [],
          j,
          m,
          name,
          k,
          p,
          fourthLevel,
          shortValue,
          longValue,
          itemFacetList,
          descriptions,
          id,
          supplement,
          temp,
          sortOrder,
          sortOrderObj,
          itemAlreadyExisted,
          elementType

        // IE9 doesn't support getAttributeNS, so hack around it
        function getAttributeNS(elmt, ns, name) {
          if (elmt.getAttributeNS) {
            return elmt.getAttributeNS(ns, name)
          }

          var atts = elmt.attributes,
            att,
            i,
            n = atts.length
          for (i = 0; i < n; i++) {
            att = atts[i]
            if (att.namespaceURI === ns && att.baseName === name) {
              return att.value
            }
          }
          return null
        }

        collection = xml.documentElement

        // A constant value for XML nodes that are elements, not text or comments.
        elementType = collection.ELEMENT_NODE || 1

        supplement = getAttributeNS(collection, pivotNS, "Supplement")
        if (supplement) {
          // fire off a new request for the supplemental CXML file.
          Seadragon2.Xml.fetch(
            url
              .split("/")
              .slice(0, -1)
              .join("/") +
              "/" +
              supplement,
            onSuccess,
            onFailure
          )
        }

        // Facet categories get set first
        temp = collection.getAttribute("Name")
        if (temp) {
          // viewer.setTitle(temp)
        }
        secondLevel = collection.getElementsByTagName("FacetCategories")[0]
        if (secondLevel) {
          secondLevel = secondLevel.childNodes // perf?
          n = secondLevel.length
          for (i = 0; i < n; i++) {
            cur = secondLevel[i]
            if (cur.nodeType === elementType) {
              facets[cur.getAttribute("Name")] = facet = {
                index: i,
              }
              facet.type = cur.getAttribute("Type")
              facet.isFilterVisible =
                getAttributeNS(cur, pivotNS, "IsFilterVisible") === "true"
              facet.isMetaDataVisible =
                getAttributeNS(cur, pivotNS, "IsMetaDataVisible") === "true"
              facet.isWordWheelVisible =
                getAttributeNS(cur, pivotNS, "IsWordWheelVisible") === "true"

              // the children of each FacetCategory could be extensions, so we have to
              // check for them.
              thirdLevel = cur.childNodes
              m = thirdLevel.length
              for (j = 0; j < m; j++) {
                fourthLevel = thirdLevel[j].firstChild
                if (fourthLevel) {
                  // test for the SortOrder extension
                  if (
                    (fourthLevel.localName || fourthLevel.baseName) ===
                      "SortOrder" &&
                    fourthLevel.namespaceURI === pivotNS
                  ) {
                    facet.orders = facet.orders || []
                    sortOrderObj = {
                      name: fourthLevel.getAttribute("Name"),
                    }
                    sortOrder = sortOrderObj.order = []
                    facet.orders.push(sortOrderObj)
                    fourthLevel = fourthLevel.childNodes
                    p = fourthLevel.length
                    for (k = 0; k < p; k++) {
                      temp = fourthLevel[k]
                      if (
                        (temp.localName || temp.baseName) === "SortValue" &&
                        temp.namespaceURI === pivotNS
                      ) {
                        sortOrder.push(temp.getAttribute("Value"))
                      }
                    }
                  }
                  // TODO other extensions?
                }
              }
            }
          }
        }

        // look for the legal-info extension
        secondLevel = collection.childNodes
        for (i = secondLevel.length - 1; i >= 0; i--) {
          temp = secondLevel[i]
          if (temp.tagName === "Extension") {
            thirdLevel = temp.firstChild
            if (
              thirdLevel &&
              (thirdLevel.localName || thirdLevel.baseName) === "Copyright" &&
              thirdLevel.namespaceURI === pivotNS
            ) {
              // viewer.setCopyright({
              //   href:
              //     url
              //       .split("/")
              //       .slice(0, -1)
              //       .join("/") +
              //     "/" +
              //     thirdLevel.getAttribute("Href"),
              //   name: thirdLevel.getAttribute("Name"),
              // })
            }
          }
        }

        // now we can look through all of the items
        secondLevel = collection.getElementsByTagName("Items")[0]
        if (!secondLevel) {
          // no item info in this file
          return
        }
        temp = secondLevel.getAttribute("ImgBase")
        if (temp) {
          var isAbsoluteURL =
            temp.indexOf("://") > 0 || temp.indexOf("//") === 0
          imgBase = isAbsoluteURL
            ? temp
            : url.slice(0, url.lastIndexOf("/") + 1) + temp.replace("\\", "/")
        }
        secondLevel = secondLevel.childNodes
        n = secondLevel.length
        for (i = 0; i < n; i++) {
          cur = secondLevel[i]
          if (cur.nodeType === elementType) {
            id = cur.getAttribute("Id")

            // try to get the existing item, if we already started building it in a
            // previous chunk of CXML.
            item = viewer.getItemById(id)

            if (item) {
              // the item already existed (we're currently reading supplemental info about it).
              // this means we'll have to notify the viewer that we were messing with this item
              // (it may have to recompute templates, etc.).
              itemAlreadyExisted = true
            } else {
              // this is a new item
              item = {}
              item.id = id
              item.facets = {}
            }
            items.push(item)
            temp = cur.getAttribute("Href")
            if (temp) {
              item.href = temp
            }
            temp = cur.getAttribute("Name")
            if (temp) {
              item.name = temp
            }
            temp = cur.getAttribute("Img")
            if (temp) {
              item.img = imgBase + temp
            }
            descriptions = cur.getElementsByTagName("Description")
            if (descriptions.length) {
              item.description =
                descriptions[0].textContent || descriptions[0].text
            }
            thirdLevel = cur.getElementsByTagName("Facets")[0]
            if (thirdLevel) {
              thirdLevel = thirdLevel.childNodes
              m = thirdLevel.length
              for (j = 0; j < m; j++) {
                cur = thirdLevel[j]
                if (cur.nodeType === elementType) {
                  name = cur.getAttribute("Name")
                  facet = facets[name]
                  item.facets[name] = itemFacetList = []
                  fourthLevel = cur.childNodes
                  p = fourthLevel.length
                  for (k = 0; k < p; k++) {
                    cur = fourthLevel[k]
                    if (cur.nodeType === elementType) {
                      switch (facet.type) {
                        case "String":
                        case "LongString":
                          shortValue = longValue = cur
                            .getAttribute("Value")
                            .trim()
                          break
                        case "Link":
                          shortValue = cur.getAttribute("Name").trim()
                          longValue = {
                            content: shortValue,
                            href: cur.getAttribute("Href"),
                          }
                          break
                        case "Number":
                          shortValue = cur.getAttribute("Value")
                          longValue = parseFloat(shortValue)
                          break
                        case "DateTime":
                          shortValue = cur.getAttribute("Value")
                          longValue = new Date(shortValue)
                          break
                        default:
                          Seadragon2.Debug.warn(
                            "Unknown facet type " + facet.type
                          )
                          shortValue = longValue = cur.getAttribute("Value")
                      }
                      itemFacetList.push(longValue)
                    }
                  }
                }
              }
            }
          }
        }

        // return loaded facets and items
        resolve({ facets, items })
      }

      // now fetch the cxml
      Seadragon2.Xml.fetch(url, onSuccess, onFailure)
    })
  },
})
