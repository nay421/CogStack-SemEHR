/**
 * Created by honghan.wu on 04/07/2017.
 */
if (typeof semehr == "undefined"){
    var semehr = {};
}

(function($) {
    if(typeof semehr.Render == "undefined") {

        semehr.Render = {
            docDisplayAttrs: [
                // ["charttime", "chartdate", "docType", "fulltext"],
                ["updatetime", "document_description", "body_analysed"], 
                ["basicobs_createdwhen", "basicobs_itemname_analysed", "textualObs"]],

            /**
             * highlight a piece of text with an array of annotations
             * @param anns
             * @param text
             * @param snippet
             * @returns {string}
             */
            highlightText: function (anns, text, snippet) {
                var hos = [];
                for (var idx in anns){
                    hos.push({"term": "", "s": anns[idx]['start'], "e": anns[idx]['end'],
                        "t": anns[idx].type? anns[idx].type : ""});
                }
                hos = hos.sort(function(a, b){
                    return a["s"] - b["s"];
                });

                var moreTextLen = 20;
                var new_str = "";
                if (hos.length > 0){
                    var prev_pos = snippet ? (hos[0]['s'] > moreTextLen ? hos[0]['s'] - moreTextLen : hos[0]['s']) : 0;
                    if (prev_pos > 0)
                        new_str += "...";
                    for (var idx in hos){
                        new_str += text.substring(prev_pos, hos[idx]["s"]) +
                            "<em title='" + hos[idx]["t"] + "'>" + text.substring(hos[idx]["s"], hos[idx]["e"]) + "</em>";
                        prev_pos = hos[idx]["e"];
                        if (snippet)
                            break;
                    }
                    var endPos = snippet ? Math.min(parseInt(prev_pos) + moreTextLen, text.length) : text.length;
                    new_str += text.substring(prev_pos, endPos);
                    if (endPos < text.length)
                        new_str += "...";
                }else{
                    new_str = snippet ? text.substring(0, Math.min(text.length, moreTextLen)) + "...": text;
                }
                return new_str;
            },

            /**
             * render a clinical note
             * @param doc
             * @param renderElem
             */
            renderDoc: function(doc, renderElem){
                var s = semehr.Render.getDocDisplay(doc);
                $(renderElem).html(s)

                // for(var k in _user_feedback){
                //     $('#' + k + ' .' + _user_feedback[k]).addClass('fbed');
                // }
                swal.close();
            },

            getDocDisplay: function(doc){
                var attrs = semehr.Render.docDisplayAttrs[semehr.search.__indice_index];
                var s =
                    "<div class='clsRow'><div class='clsField'>DocID</div>" +
                    "<div attr='did' class='clsValue'>" + doc['id'] + "</div></div>";
                var d = doc['docDetail'];
                for(var i=0;i<attrs.length;i++){
                    var attrS = '';
                    var attr = attrs[i];
                    var val = d[attr];
                    if (attr == semehr.search._full_text_attr[semehr.search.__indice_index]){
                        val = "<span class='full'>" + semehr.Render.highlightText(doc["mentions"], d[attr], false) + "</span>";
                    }
                    attrS += "<div class='clsField'>" + attr + "</div>";
                    attrS += "<div attr='" + attr + "' class='clsValue'>" + val + "</div>";
                    s += "<div class='clsRow clsDoc'>" + attrS + "</div>";
                }
                return s;
            },

            showPopupLayer: function(sHtml){
                $('#chartDiv').html(sHtml);
                $('#chartDivOverlay').css('visibility', 'visible');
                $('body').css('overflow','hidden');
                $("#chartDivOverlay").show();
                $('#chartDiv').append('<label class="modal__close"></label>');
                $('.modal__close').click(function(){
                    $('body').css('overflow','auto');
                    $("#chartDivOverlay").hide();
                });
                d3.select("#chartDivOverlay").style("opacity", 1);
            },

            renderSummaries: function(sumObj, searchCUIs) {
                var s = "<h1 class='sumHeading'>Patient View for " + sumObj.id + "</h1>";
                s += "<div class='sumTitle'>" +
                    "Total " + sumObj.totalDocs.length + " notes, " + sumObj.numMatchedDocs + " matched your search." +
                    "</div>";
                sumObj.totalDocs = sumObj.totalDocs.sort(function(d1, d2){
                    return d1.chartdate - d2.chartdate;
                });
                var docS = "";
                for(var i=0;i<sumObj.totalDocs.length;i++){
                    var d = sumObj.totalDocs[i];
                    docS += "<div class='sumDoc " + (d.matched ? "sumMatched" : "") + "'>" +
                        d.docType + "</div>\n";
                }
                s += "<div class='sumDocList'>" + docS + "</div>";
                s += "<div class='sumProfile'></div>";
                semehr.Render.showPopupLayer(s);
                if (sumObj.dischargeSummary != null){
                    semehr.search.getDocument(sumObj.dischargeSummary.eprid, function(s){
                        var medProf = semehr.MedProfile.generateMedProfile(s._source.fulltext, s._source.anns);
                        var measures = semehr.MedProfile.parseMedicalSection(medProf);
                        semehr.Render.renderDischargeSummary(medProf, measures, $('.sumProfile'), searchCUIs);
                    });
                }else
                    semehr.Render.renderDischargeSummary(null, $('.sumProfile'), null);
            },

            renderDischargeSummary: function(disSumObj, measures, pElem, searchCUIs){
                var s = "";
                if (disSumObj == null){
                    $(pElem).html("<div class='sumTitle'>Structured Medical Profile</div>" +
                        "<div class='sumMsg'>Medical profile not ready yet.</div>");
                }else{
                    if (measures && Object.keys(measures).length> 0){
                        var measueTbl = "";
                        for(var key in measures){
                            var values = measures[key].value;
                            var matched = false;
                            if (searchCUIs && searchCUIs.length > 0){
                                if (jQuery.inArray(measures[key].cui, searchCUIs) >= 0){
                                    matched = true;
                                }
                            }
                            measueTbl += "<div class='sumMTRow " + (matched ? "sumMTMatched":"") + "'><div class='sumMTCell sumMTKey'>" + key + "</div>" +
                                "<div class='sumMTCell sumMTVal'>" + values[values.length - 1] +
                                (values.length > 1 ? " ... ":"") +
                                "</div></div>";
                        }
                        s += "<div class='sumTitle'>Vital Signs and other measurements</div>" +
                            "<div class='sumMTTable'>" + measueTbl + "</div>";
                    }
                    s += "<div class='sumTitle'>Structured Medical Profile</div>";
                    for(var i=0;i<disSumObj.length;i++){
                        var secHtml = "";
                        var secObj = disSumObj[i];
                        var anns = [];
                        // temporary offset fixing
                        for (var j=0;j<secObj.anns.length;j++){
                            anns.push(
                                {'start': secObj.anns[j].startNode.offset - secObj.start,
                                    'end': secObj.anns[j].endNode.offset - secObj.start,
                                    'type': secObj.anns[j].features.PREF + ' (' + secObj.anns[j].features.STY + ' | ' +
                                    secObj.anns[j].features.inst + ')'
                                });
                        }

                        var secTitle = secObj.section == "" ? "Basic Info" : secObj.section;
                        var secId = secTitle.replace(/\s/ig, '_');
                        secHtml += "<div class='dsSecTitle' sec='" + secId + "'>" + secTitle + "</div>";
                        secHtml +=
                            "<div class='full dsSec " + secId + "'>" +
                            semehr.Render.highlightText(anns, secObj.text, false) +
                            "</div>";
                        s += secHtml + "\n";
                    }
                    $(pElem).html(s);
                    $('.dsSecTitle').click(function(){
                        var secId = '.' + $(this).attr('sec');
                        if ($(secId).css('display') !== 'none') {
                            $(secId).hide();
                            $(this).removeClass('openSec');
                        }
                        else {
                            $(secId).show();
                            $(this).addClass('openSec');
                        }
                    });
                }

            },

            renderPatientDocs: function(docs, container, docSelectFunc){
                var attrTypes = semehr.search._es_doc_type_field;
                var attrDates = semehr.search._es_doc_date_field;
                docs.sort(function(a, b){
                    var attrDateA = semehr.Render.getAttrNameFromList(attrDates, a["_source"]);
                    var attrDateB = semehr.Render.getAttrNameFromList(attrDates, b["_source"]);
                    return a['_source'][attrDateA] >= b['_source'][attrDateB] ? -1 : 1;
                })
                var s = "<div class='dRowHeader'><div class='dRowTitle'>document type</div><div class='dRowTitle'>document date</div></div>";
                for (var i=0;i<docs.length;i++){
                    var d = docs[i]['_source'];
                    var attrType = semehr.Render.getAttrNameFromList(attrTypes, d);
                    var attrDate = semehr.Render.getAttrNameFromList(attrDates, d);
                    s += "<div class='dRow' docId='" + docs[i]['_id'] + "'><div class='cAttr'>" + docs[i]["_id"] + "</div><div class='cAttr'>" + d[attrType] + "</div><div class='cAttr'>" + d[attrDate] + "</div></div>";
                }
                $(container).html(s);
                $('.dRow').click(function(){
                    $('.dRow').removeClass('sel');
                    $(this).addClass('sel');
                    docSelectFunc($(this).attr('docId'));
                });
            },

            getAttrNameFromList: function(attrs, d){
                for(var i=0;i<attrs.length;i++){
                    if (attrs[i] in d)
                        return attrs[i];
                }
                return null;
            },

            renderSemQueryResult: function(p, mDocs){
                if (mDocs.length == 0)
                    return;
                var s = "<h2 class='clsPhenotypeResult'>semantic search results of [" + p.replace(/\\:/, ":") + "]</h2>";
                for (var i=0;i<mDocs.length;i++){
                    var d = mDocs[i];
                    s += "<div class='clsSniptDoc'>snippts in " + d['d'] + "</div>";
                    s += "<div class='clsSnipts'>" + d.hts.join("<br/>") + "</div>";
                }
                $('#lbl' + p).parent().click(function(){
                    semehr.Render.showPopupLayer(s);
                });
            }
        };
    }

})(jQuery);
