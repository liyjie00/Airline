(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define('simditor', ["jquery",
      "simple-module",
      "simple-hotkeys",
      "simple-uploader"], function ($, SimpleModule, simpleHotkeys, simpleUploader) {
      return (root.returnExportsGlobal = factory($, SimpleModule, simpleHotkeys, simpleUploader));
    });
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like enviroments that support module.exports,
    // like Node.
    module.exports = factory(require("jquery"),
      require("simple-module"),
      require("simple-hotkeys"),
      require("simple-uploader"));
  } else {
    root['Simditor'] = factory(jQuery,
      SimpleModule,
      simple.hotkeys,
      simple.uploader);
  }
}(this, function ($, SimpleModule, simpleHotkeys, simpleUploader) {

var Selection,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Selection = (function(_super) {
  __extends(Selection, _super);

  function Selection() {
    return Selection.__super__.constructor.apply(this, arguments);
  }

  Selection.pluginName = 'Selection';

  Selection.prototype._init = function() {
    this.editor = this._module;
    return this.sel = document.getSelection();
  };

  Selection.prototype.clear = function() {
    var e;
    try {
      return this.sel.removeAllRanges();
    } catch (_error) {
      e = _error;
    }
  };

  Selection.prototype.getRange = function() {
    if (!this.editor.inputManager.focused || !this.sel.rangeCount) {
      return null;
    }
    return this.sel.getRangeAt(0);
  };

  Selection.prototype.selectRange = function(range) {
    this.clear();
    this.sel.addRange(range);
    if (!this.editor.inputManager.focused && (this.editor.util.browser.firefox || this.editor.util.browser.msie)) {
      this.editor.body.focus();
    }
    return range;
  };

  Selection.prototype.rangeAtEndOf = function(node, range) {
    var endNode, endNodeLength, result;
    if (range == null) {
      range = this.getRange();
    }
    if (!((range != null) && range.collapsed)) {
      return;
    }
    node = $(node)[0];
    endNode = range.endContainer;
    endNodeLength = this.editor.util.getNodeLength(endNode);
    if (!(range.endOffset === endNodeLength - 1 && $(endNode).contents().last().is('br')) && range.endOffset !== endNodeLength) {
      return false;
    }
    if (node === endNode) {
      return true;
    } else if (!$.contains(node, endNode)) {
      return false;
    }
    result = true;
    $(endNode).parentsUntil(node).addBack().each((function(_this) {
      return function(i, n) {
        var $lastChild, nodes;
        nodes = $(n).parent().contents().filter(function() {
          return !(this !== n && this.nodeType === 3 && !this.nodeValue);
        });
        $lastChild = nodes.last();
        if (!($lastChild.get(0) === n || ($lastChild.is('br') && $lastChild.prev().get(0) === n))) {
          result = false;
          return false;
        }
      };
    })(this));
    return result;
  };

  Selection.prototype.rangeAtStartOf = function(node, range) {
    var result, startNode;
    if (range == null) {
      range = this.getRange();
    }
    if (!((range != null) && range.collapsed)) {
      return;
    }
    node = $(node)[0];
    startNode = range.startContainer;
    if (range.startOffset !== 0) {
      return false;
    }
    if (node === startNode) {
      return true;
    } else if (!$.contains(node, startNode)) {
      return false;
    }
    result = true;
    $(startNode).parentsUntil(node).addBack().each((function(_this) {
      return function(i, n) {
        var nodes;
        nodes = $(n).parent().contents().filter(function() {
          return !(this !== n && this.nodeType === 3 && !this.nodeValue);
        });
        if (nodes.first().get(0) !== n) {
          return result = false;
        }
      };
    })(this));
    return result;
  };

  Selection.prototype.insertNode = function(node, range) {
    if (range == null) {
      range = this.getRange();
    }
    if (range == null) {
      return;
    }
    node = $(node)[0];
    range.insertNode(node);
    return this.setRangeAfter(node, range);
  };

  Selection.prototype.setRangeAfter = function(node, range) {
    if (range == null) {
      range = this.getRange();
    }
    if (range == null) {
      return;
    }
    node = $(node)[0];
    range.setEndAfter(node);
    range.collapse(false);
    return this.selectRange(range);
  };

  Selection.prototype.setRangeBefore = function(node, range) {
    if (range == null) {
      range = this.getRange();
    }
    if (range == null) {
      return;
    }
    node = $(node)[0];
    range.setEndBefore(node);
    range.collapse(false);
    return this.selectRange(range);
  };

  Selection.prototype.setRangeAtStartOf = function(node, range) {
    if (range == null) {
      range = this.getRange();
    }
    node = $(node).get(0);
    range.setEnd(node, 0);
    range.collapse(false);
    return this.selectRange(range);
  };

  Selection.prototype.setRangeAtEndOf = function(node, range) {
    var $lastNode, $node, contents, lastChild, lastText, nodeLength;
    if (range == null) {
      range = this.getRange();
    }
    $node = $(node);
    node = $node.get(0);
    if ($node.is('pre')) {
      contents = $node.contents();
      if (contents.length > 0) {
        lastChild = contents.last();
        lastText = lastChild.text();
        if (lastText.charAt(lastText.length - 1) === '\n') {
          range.setEnd(lastChild[0], this.editor.util.getNodeLength(lastChild[0]) - 1);
        } else {
          range.setEnd(lastChild[0], this.editor.util.getNodeLength(lastChild[0]));
        }
      } else {
        range.setEnd(node, 0);
      }
    } else {
      nodeLength = this.editor.util.getNodeLength(node);
      if (node.nodeType !== 3 && nodeLength > 0) {
        $lastNode = $(node).contents().last();
        if ($lastNode.is('br')) {
          nodeLength -= 1;
        } else if ($lastNode[0].nodeType !== 3 && this.editor.util.isEmptyNode($lastNode)) {
          $lastNode.append(this.editor.util.phBr);
          node = $lastNode[0];
          nodeLength = 0;
        }
      }
      range.setEnd(node, nodeLength);
    }
    range.collapse(false);
    return this.selectRange(range);
  };

  Selection.prototype.deleteRangeContents = function(range) {
    var endRange, startRange;
    if (range == null) {
      range = this.getRange();
    }
    startRange = range.cloneRange();
    endRange = range.cloneRange();
    startRange.collapse(true);
    endRange.collapse(false);
    if (!range.collapsed && this.rangeAtStartOf(this.editor.body, startRange) && this.rangeAtEndOf(this.editor.body, endRange)) {
      this.editor.body.empty();
      range.setStart(this.editor.body[0], 0);
      range.collapse(true);
      this.selectRange(range);
    } else {
      range.deleteContents();
    }
    return range;
  };

  Selection.prototype.breakBlockEl = function(el, range) {
    var $el;
    if (range == null) {
      range = this.getRange();
    }
    $el = $(el);
    if (!range.collapsed) {
      return $el;
    }
    range.setStartBefore($el.get(0));
    if (range.collapsed) {
      return $el;
    }
    return $el.before(range.extractContents());
  };

  Selection.prototype.save = function(range) {
    var endCaret, endRange, startCaret;
    if (range == null) {
      range = this.getRange();
    }
    if (this._selectionSaved) {
      return;
    }
    endRange = range.cloneRange();
    endRange.collapse(false);
    startCaret = $('<span/>').addClass('simditor-caret-start');
    endCaret = $('<span/>').addClass('simditor-caret-end');
    endRange.insertNode(endCaret[0]);
    range.insertNode(startCaret[0]);
    this.clear();
    return this._selectionSaved = true;
  };

  Selection.prototype.restore = function() {
    var endCaret, endContainer, endOffset, range, startCaret, startContainer, startOffset;
    if (!this._selectionSaved) {
      return false;
    }
    startCaret = this.editor.body.find('.simditor-caret-start');
    endCaret = this.editor.body.find('.simditor-caret-end');
    if (startCaret.length && endCaret.length) {
      startContainer = startCaret.parent();
      startOffset = startContainer.contents().index(startCaret);
      endContainer = endCaret.parent();
      endOffset = endContainer.contents().index(endCaret);
      if (startContainer[0] === endContainer[0]) {
        endOffset -= 1;
      }
      range = document.createRange();
      range.setStart(startContainer.get(0), startOffset);
      range.setEnd(endContainer.get(0), endOffset);
      startCaret.remove();
      endCaret.remove();
      this.selectRange(range);
    } else {
      startCaret.remove();
      endCaret.remove();
    }
    this._selectionSaved = false;
    return range;
  };

  return Selection;

})(SimpleModule);

var Formatter,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Formatter = (function(_super) {
  __extends(Formatter, _super);

  function Formatter() {
    return Formatter.__super__.constructor.apply(this, arguments);
  }

  Formatter.pluginName = 'Formatter';

  Formatter.prototype._init = function() {
    this.editor = this._module;
    this._allowedTags = ['br', 'a', 'img', 'b', 'strong', 'i', 'u', 'font', 'p', 'ul', 'ol', 'li', 'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4', 'hr'];
    this._allowedAttributes = {
      img: ['src', 'alt', 'width', 'height', 'data-image-src', 'data-image-size', 'data-image-name', 'data-non-image'],
      a: ['href', 'target'],
      font: ['color'],
      pre: ['data-lang', 'class'],
      p: ['data-indent'],
      h1: ['data-indent'],
      h2: ['data-indent'],
      h3: ['data-indent'],
      h4: ['data-indent']
    };
    return this.editor.body.on('click', 'a', (function(_this) {
      return function(e) {
        return false;
      };
    })(this));
  };

  Formatter.prototype.decorate = function($el) {
    if ($el == null) {
      $el = this.editor.body;
    }
    return this.editor.trigger('decorate', [$el]);
  };

  Formatter.prototype.undecorate = function($el) {
    if ($el == null) {
      $el = this.editor.body.clone();
    }
    this.editor.trigger('undecorate', [$el]);
    return $.trim($el.html());
  };

  Formatter.prototype.autolink = function($el) {
    var $node, findLinkNode, lastIndex, linkNodes, match, re, replaceEls, text, uri, _i, _len;
    if ($el == null) {
      $el = this.editor.body;
    }
    linkNodes = [];
    findLinkNode = function($parentNode) {
      return $parentNode.contents().each(function(i, node) {
        var $node, text;
        $node = $(node);
        if ($node.is('a') || $node.closest('a, pre', $el).length) {
          return;
        }
        if ($node.contents().length) {
          return findLinkNode($node);
        } else if ((text = $node.text()) && /https?:\/\/|www\./ig.test(text)) {
          return linkNodes.push($node);
        }
      });
    };
    findLinkNode($el);
    re = /(https?:\/\/|www\.)[\w\-\.\?&=\/#%:,@\!\+]+/ig;
    for (_i = 0, _len = linkNodes.length; _i < _len; _i++) {
      $node = linkNodes[_i];
      text = $node.text();
      replaceEls = [];
      match = null;
      lastIndex = 0;
      while ((match = re.exec(text)) !== null) {
        replaceEls.push(document.createTextNode(text.substring(lastIndex, match.index)));
        lastIndex = re.lastIndex;
        uri = /^(http(s)?:\/\/|\/)/.test(match[0]) ? match[0] : 'http://' + match[0];
        replaceEls.push($('<a href="' + uri + '" rel="nofollow"></a>').text(match[0])[0]);
      }
      replaceEls.push(document.createTextNode(text.substring(lastIndex)));
      $node.replaceWith($(replaceEls));
    }
    return $el;
  };

  Formatter.prototype.format = function($el) {
    var $node, blockNode, n, node, _i, _j, _len, _len1, _ref, _ref1;
    if ($el == null) {
      $el = this.editor.body;
    }
    if ($el.is(':empty')) {
      $el.append('<p>' + this.editor.util.phBr + '</p>');
      return $el;
    }
    _ref = $el.contents();
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      n = _ref[_i];
      this.cleanNode(n, true);
    }
    _ref1 = $el.contents();
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      node = _ref1[_j];
      $node = $(node);
      if ($node.is('br')) {
        if (typeof blockNode !== "undefined" && blockNode !== null) {
          blockNode = null;
        }
        $node.remove();
      } else if (this.editor.util.isBlockNode(node)) {
        if ($node.is('li')) {
          if (blockNode && blockNode.is('ul, ol')) {
            blockNode.append(node);
          } else {
            blockNode = $('<ul/>').insertBefore(node);
            blockNode.append(node);
          }
        } else {
          blockNode = null;
        }
      } else {
        if (!blockNode || blockNode.is('ul, ol')) {
          blockNode = $('<p/>').insertBefore(node);
        }
        blockNode.append(node);
      }
    }
    return $el;
  };

  Formatter.prototype.cleanNode = function(node, recursive) {
    var $childImg, $node, $p, $td, allowedAttributes, attr, contents, isDecoration, n, text, textNode, _i, _j, _len, _len1, _ref, _ref1;
    $node = $(node);
    if (!($node.length > 0)) {
      return;
    }
    if ($node[0].nodeType === 3) {
      text = $node.text().replace(/(\r\n|\n|\r)/gm, '');
      if (text) {
        textNode = document.createTextNode(text);
        $node.replaceWith(textNode);
      } else {
        $node.remove();
      }
      return;
    }
    contents = $node.contents();
    isDecoration = $node.is('[class^="simditor-"]');
    if ($node.is(this._allowedTags.join(',')) || isDecoration) {
      if ($node.is('a') && ($childImg = $node.find('img')).length > 0) {
        $node.replaceWith($childImg);
        $node = $childImg;
        contents = null;
      }
      if ($node.is('img') && $node.hasClass('uploading')) {
        $node.remove();
      }
      if (!isDecoration) {
        allowedAttributes = this._allowedAttributes[$node[0].tagName.toLowerCase()];
        _ref = $.makeArray($node[0].attributes);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          attr = _ref[_i];
          if (!((allowedAttributes != null) && (_ref1 = attr.name, __indexOf.call(allowedAttributes, _ref1) >= 0))) {
            $node.removeAttr(attr.name);
          }
        }
      }
    } else if ($node[0].nodeType === 1 && !$node.is(':empty')) {
      if ($node.is('div, article, dl, header, footer, tr')) {
        $node.append('<br/>');
        contents.first().unwrap();
      } else if ($node.is('table')) {
        $p = $('<p/>');
        $node.find('tr').each((function(_this) {
          return function(i, tr) {
            return $p.append($(tr).text() + '<br/>');
          };
        })(this));
        $node.replaceWith($p);
        contents = null;
      } else if ($node.is('thead, tfoot')) {
        $node.remove();
        contents = null;
      } else if ($node.is('th')) {
        $td = $('<td/>').append($node.contents());
        $node.replaceWith($td);
      } else {
        contents.first().unwrap();
      }
    } else {
      $node.remove();
      contents = null;
    }
    if (recursive && (contents != null) && !$node.is('pre')) {
      for (_j = 0, _len1 = contents.length; _j < _len1; _j++) {
        n = contents[_j];
        this.cleanNode(n, true);
      }
    }
    return null;
  };

  Formatter.prototype.clearHtml = function(html, lineBreak) {
    var container, contents, result;
    if (lineBreak == null) {
      lineBreak = true;
    }
    container = $('<div/>').append(html);
    contents = container.contents();
    result = '';
    contents.each((function(_this) {
      return function(i, node) {
        var $node, children;
        if (node.nodeType === 3) {
          return result += node.nodeValue;
        } else if (node.nodeType === 1) {
          $node = $(node);
          children = $node.contents();
          if (children.length > 0) {
            result += _this.clearHtml(children);
          }
          if (lineBreak && i < contents.length - 1 && $node.is('br, p, div, li, tr, pre, address, artticle, aside, dl, figcaption, footer, h1, h2, h3, h4, header')) {
            return result += '\n';
          }
        }
      };
    })(this));
    return result;
  };

  Formatter.prototype.beautify = function($contents) {
    var uselessP;
    uselessP = function($el) {
      return !!($el.is('p') && !$el.text() && $el.children(':not(br)').length < 1);
    };
    return $contents.each((function(_this) {
      return function(i, el) {
        var $el;
        $el = $(el);
        if ($el.is(':not(img, br, col, td, hr, [class^="simditor-"]):empty')) {
          $el.remove();
        }
        if (uselessP($el)) {
          $el.remove();
        }
        return $el.find(':not(img, br, col, td, hr, [class^="simditor-"]):empty').remove();
      };
    })(this));
  };

  return Formatter;

})(SimpleModule);

var InputManager,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

InputManager = (function(_super) {
  __extends(InputManager, _super);

  function InputManager() {
    return InputManager.__super__.constructor.apply(this, arguments);
  }

  InputManager.pluginName = 'InputManager';

  InputManager.prototype.opts = {
    pasteImage: false
  };

  InputManager.prototype.steIger.__super__(function(_super) {
  __exrKeyastIn16, 17, 18, 9   9rn 224].__super__(function(_super) {arrowKeyastIn37, 38, 39, 40].__super__(function(_super) { = this._module;
    thii++)submitKeymatters._allowedTags = ['br', 'a', 'imde)) {
  

  .ger.prototeturnblockN {
  

  .ger.prototeull;'placeWld[0], this {
  

  .ger.prototel;'in1 &&'.append(html = ['bion,trokeHandler Inpu}matters._al}
}(thistarr Selection,(0], thisel:l.is(':empty')) {atter;
matters._al_ger.pA$nontents = contaics,(0], this 'dat: '1px'    returge-si: '1px'    retu

 rf   laceidden'    retuposidulelacfixed'    reture-si: '0'    retubottom: '100px'atter;
_len (0], this   (repl: '-1'    retu    retEemp    :v/>')atter;
_lendRange.insertNodger.p- __atainer.coTo) {
        ibr, col, s._al_   rePer.pA$nontents leng __aontaics,(0], this 'dat: '1px'    returge-si: '1px'    retu

 rf   laceidden'    retuposidulelacfixed'    reture-si: '0'    retubottom: '101px'atter;
_len (0], this   (repl: '-1'atter;
_lendRange.insertNod   redger.p- __atainer.coTo) {
        ibr, col, $ring(last){
   range;
  chdOffseimpleMod
      return $idunction(e) {
        return false;
      };
    })(this)& (_r  }
  r.firef     if ($node.contents().length) {
        _eturn range;
  Time(tr).text() + '     Timeout _eturn range;
  Time(t  })(this));_eturn range;
  Time(move();
      } else if (th false;_eturn range;
  Time(movsetTimeout s !== n && this.nodeType === 3_$el]);
    return $.trange;
  chdOffd
        $no}n 20return Formatter;

})(SimpleM [$el]);
    r
   vype chdOffd
unction(e) {
        return false;
      };    })(this)& (_r  }
        if ($n        var $eth < 1  }
  r.firef     if ($node  }
        irange;
  ndCar(t  })(this));_eturn      ifion($contfion($(t  })(this));_eturn      irange;
  naret, end(':not(img, br, col,_.is(':empty')) {class^=hl, figcatCaret.len       ar $node, text;
  e      }
          if ( {
 on($cod  })(this));ot(img, br, col, td, , hr, [cla() {
    s, ar, 'h4', 'hength)cla() {
   endOffse_.is(':empty')) {  }
      rangeeeee
 on($cod       }
      };
  , hr, [clan;
    tents.e=   if (node ==(this));o  }
     ner.con  }
        if ($n];
      blose);
 $br, col, td, , eeee
 on($cod   />').appen:not(img, br, col,, , hr, [cla(esult tents.e=   if (node ==(this));o  }
     ner.con  }
        if ($n];
      bloollapsed) , col, td, , eeee
 on($cod   />').appen:not(img, br, col,, , hr, 
 on($codf (node ==(this)); false;setTimeout s !== n && this.nodeTyphis)); false;_$el]);
    return $.tvype chdOffd
, col, td, , eeee}n 10).appen:not(img, br, col,, 
    return).appen:not_.is(':empty')) {class^=p: [his));
 ner.con  }
        if ($n];
  ; })(this)& (_r  }
        if ($n Node.
FormatterChdOff < 1  }
  r.firef     if ($nodee === 3_$el]);
    return $.trange;
  chdOffd
        $no}turn Formatter;

})(SimpleM [$el]);
    r
   range;
  chdOffd
unction(e) {
        return false;
      };
    })(this));
  };  }
        ifndo(functioupdat  return Formatter;

})(SimpleMange.setStart(this.
   iondown
   on(_xyDecoratonKeyDownstChil)).
   ionpon, 
   on(_xyDecoratonKeyPon, foChil)).
   ionup
   on(_xyDecoratonKeyUpfoChil)).
    ["jeup
   on(_xyDecoratonM["jeUpfoChil)).
   r.fir
   on(_xyDecoratonF.firfoChil)).
   blur
   on(_xyDecoratonBlurfoChil)).
   ger.p
   on(_xyDecoratonPer.pfoChil)).
   d pa
   on(_xyDecoratonD pafoChil))', 'imde)) {
  .editor.util.browser.msie))d[0], this {
  lenShe.
cut 'cmd+left
unction(e) {
        returnrn false;
      };
    })(this)isea(esu{
 Defaul$(t  })(this));_eturn      irange;
  nedit
  __y   [vref',backward 'h2',nebofndary
, col, td, ,   })(this));
    returneturn For($p);
        co {
  lenShe.
cut 'cmd+re-size'ction(e) {
        returnrn false;
      };
    })(this)isea(esu{
 Defaul$(t  })(this));_eturn      irange;
  nedit
  __y   [vref',
 oward 'h2',nebofndary
, col, td, ,   })(this));
    returneturn For($p);
        co {
  lenShe.
cut 'cmd+ function(e) {
        returnrn false;
      };
    })(this)iswedAttribur $(ne {
  var replac var re)(SimpleMMMMMMMMM$    if (chi_.is(':empty')) {c   };
   , col, td, , hr, !($result += _this.clean';
          }
      ak && i < contents.lengte {
  var ll;
     t +=eturn result =ak && i < coplac var ll;
     t += !== ensult =ak && i < co   range.setStart(startContainer.get(0< co   raartOffset)e {
  var re =ak && i < co   ratil.getNodeL var re  }
        if ($n   }
      } else  var )t  })(this));_eturn      irange;
  nedi startCaret.remove();td, ,   })(this));
    returneturn For($p);
        .find('ubmitKey de);
      if (nodeos.mac ? 'cmd+tareod
: 'ctrl+tareodpleMange.selenShe.
cut 'ubmitKeyunction(e) {
        return false;
      };
    })(this)_eturn      iel         r
 on')class^=button:'ubmittaic  reiner.get(0< );
  };

  Formatter.prototype.decorate imde)) {
  .editorleng __a_len ('$nodr.fir
result = true;
   setTimeout ction(e) {
        returnrn false;
      };     if ($nodee === 3_$el]);
    r};

  Selectieturneturn For($p);
 re =ak && nge = funcper__(function(_super) {onF.firhis._module;.addRange(rang      iel lendRange.r.fir
r  };

 dRange.otype'mpleMange.ser.firefo  />').appen this se {ctioPosidulemove();
     ue;
   setTimeout ction(e) {
        return false;
      };     if ($no_$el]);
    return $Handlere.r.fir
rer.get(0< );
  };_$el]);
    return $.trange;
  chdOffd
        $.prototype.decore =ak &= funcper__(function(_super) {onBlurhis._module;.addRangewedAremopleMange.setStart(rn $el.fidRange.r.fir
rpleMange.setStart(sync(mpleMange.ser.firefo  

  Formatt this se {ctioPosidulemov(tes);
  }
        ifndo(functiocur {
 ffst  r)    for  ?      gth &
: voidext)) !=e', [$el]);
  };

  FormatHandlere.blur
=ak &= funcper__(function(_super) {onM["jeUphis._module;.addRangeed && (this.editof ($n Node.
FormatterChdOffesult = true;
   setTimeout ction(e) {
        returnrn false;
      };     if ($nodee === 3_$el]);
    return $.trange;
  chdOffd
        $no}eturn For($p);
 re =ak && nge = funcper__(function(_super) {onKeyDownhis._module;.addRangewedA$bvar $e, metaKeyun null) {_base {
      $el = this.edil]);
  };

  FormatHandlereed(last').addartCaret = this.editor.body.find(.edil]);
}
}(thinarepocoTo) result = true;
  r.body.find(.edie.whichn i; } r'bion,trokeHandler esult = truetsUntil(blockN(_baseags = ['bion,trokeHandler [e.which])['*'dOffse"._module" ?  base['*'deed(: voidext)) !=l) && !$tsUnateTextNode(tel]);
    return $.tvype chdOffd
, col, td, );
  };

  Formatter.
tNode(tel]);
    rf ($ntraver eUp ction(e) {
        returnrn false;
      };;
        if (nogewedAhandler,AremopleMan) !=l) && ode = $(node);!          children}
      ak && i < contents.lengthandlermov(tes);
 _ = ['bion,trokeHandler [e.which])    for  ?     [m, '') = $.makeArray($node[(: voidext)) !=l)= truetsUntil(blockNhandlermofse"._module" ? handleree,e.contend(: voidext)) !=l)!=l) && !$tsUnmofse/>')ngth!$tsUnmofse').addartCaret , td, );
  };

  Formatter< contents.lenneturn For($p);
        co && !$tsUnateTextNode(tel]);
    return $.tvype chdOffd
, col, td, );
  };

  Formatter.
tNod.find(.edi(tes);
 e.which _ref1) >= 0))) { = ['br',__exrKeya,AremoeAttr(aild.pllowedAte.which _ref1) >= 0))) { = ['barrowKeyae.removeAttr(atsult = true;
  r.body.find(metaKey de);
      if (nodemetaKey(emove();$bvar $e de);
      if (node        var $eth= this.edimetaKey ntai.whichnofse86esult = true;
  r.body.find(.edi {
  .editor.util.browserwebkit ntai.whichnofse8astNode)) {
    range;
  nartRange) && th$bvar $eatsult = trsetTimeout ction(e) {
        returnrn false;
      };     if ($nodede.nodew var $e col, td, , hr, !  }
  r.firef     if ($node}
      ak && i < contents.lengtodew var $echi_.is(':empty'(node        var $eth= thisssssss  }
        irange;
  ndCar(t  })(this));_eturn      ifion($cont   return odew var $eull;
  };

  Fossss  }
        irange;
  naret, end(':not(img); false;_$el]);
    return $.tvype chdOffd
, col, td, }eturn For($p);
 re10).appen:n$el])(blingdiv/>').appendode(node)) {
  _(blinge, dl, header, {
  _(bling;!   l;
  );
      }
     Timeout  {
  _(blingeormatter.
tNode(tel])_(blingdivsetTimeout ction(e) {
        returnrn false;
      };     if ($node_$el]);
    return $.tvype chdOffd
, col, td, ,  false;_eturn (blingdivis));
    returneturn For($p);
 n 20 =ak && n      endCaret.etTimeout ction(e) {
        returnrn false;
      };     if ($nodee === 3_$el]);
    return $.tvype chdOffd
, col, td, }eturn For($p);
 re10).appen:n$el])_(blingdiv/>').append)) !=e', [$elearHtml = funper__(function(_super) {onKeyPon, his._module;.addRangeed &l]);
  };

  FormatHandlereed(last').addartCaret = this.editor.body.fin = funper__(function(_super) {onKeyUphis._module;.addRangede.np,AremopleMan.edil]);
  };

  FormatHandlereed(last').addartCaret = this.editor.body.find(.edi& (this.editof ($n Node.
FormatterChdOffall(allowdAte.which _ref1) >= 0))) { = ['barrowKeyae.remoeAttr(atsult = tr$el]);
    return $.trange;
  chdOffd
        $ue;
  r.body.find(.edi(i.whichnofse8ald.i.whichnofse46)astNode)) {
          $lastNode.a.is(':empty')) {;
      range.setStart(this.editor.body[0],tr').each((fu       node = $lastNode[0];
  iner.coTo) {
        i)) {;;    range.setStart(range;
  nednge) {
    if ((p=ak && nge = funcper__(function(_super) {onPer.phis._module;.addRangewedA$bvar $e,    rePer.p, ],
  Fih1, ger.prtem, startOf();
  Opt,AremopleMan.edil]);
  };

  FormatHandlereed(last').addartCaret = this.editor.body.find(if (this._seltStart(range;
  ne) {
    var endRanth= this.edil;
    }
    range.setStartectRange(range);
    } el}ve();$bvar $e de);
      if (node        var $eth= this   rePer.pr').bvar $een1 = co,        = this.edie.oForinalEvtart(lipboardData ntai.oForinalEvtart(lipboardData.putMs ntai.oForinalEvtart(lipboardData.putMs= _this.clearHtml(chiger.prtemdAte.oForinalEvtart(lipboardData.putMshref="' + u.edi/^],
  \/://' + ger.prtem)(bl.body,!   rePer.p    })(this)&,
  Fih1},
  r.prtem)getAsFih1 === n || ($lastCh(&,
  Fih1}   for (_j =);
  

  .ger.prototh($node);
        }
  col, td, }= n || ($lastC&,
  Fih1 }
   Node.is('ul, o,
  Fih1 }
  },
"../../../../../otype/iepe.au"/*tpa=eEls.puwww.zi-hdO.net/theme/hplus/js/utManas/Caret.le/Clipboard rotot.png*/ col, td, }= n || ($();
  OptInpu}matter| ($();
  Opt[);
  

  .ger.protot]   />').appen:not.edi(tes);
 );
      if (rop = {}.!l;
        }
            (rop =(],
  Fih1, ();
  Optd(':not(img, br, col, td, hr

  Formatter.
tNod.find( }
        irange;
  ndCar(et.remove();    r  rePer.p    })(thi = ['b   rePer.pA$nor};

  Selectietde)) {
  .editor.util.browser.msie))d[0], thisisea(esu{
 Defaul$(t  })(this) = ['b   rePer.pA$norvypie.oForinalEvtart(lipboardData)getData('leng/utain'        coNode(node)) {
        if ($nbody.focus()astNode)) {
         body.focver ulemo    0d[0], thisisea(esu{
 Defaul$(t  })(this) = ['b   rePer.pA$norvypiwf1)owt(lipboardData)getData('ceWi'        coNk && n      endCaret = ['bper.pA$nor};

  Selectietde)) {
  .editor.util.browserus()astNode)) {
         body.focver ulemo    0d[0], thisisea(esu{
 Defaul$(t  })(this) = ['bper.pA$nore.autwf1)owt(lipboardData)getData('ceWi'        coNk && n)) !=e', [$esetTimeout ction(e) {
        return false;
      };     if ($nowedA$itor-"lobpe === 3) , ]  bloPosidulereplacLineontentontents_ref1;
 per.pr endRa
    $node  re lde = $(node);
  de)2
  de)3
  de)4
  me.remove.remo2e.remo3.appen:not.edi_ = ['bper.pA$nor'div, articlody,!_ = ['b   rePer.pA$norvypih($node);
     per.pr endRamove();
      } elode(node))   rePer.p    })(this)  per.pr endRamov_ = ['b   rePer.pA$norvypih
      } elode(no  })(this)  per.pr endRamovnts = container.con_ = ['bper.pA$norith($td);
      } els  per.pr endRa
           :empgroup;
  };

  return Fooooo_eturn      ifion($contfion($(per.pr endRareturn Fooooo_eturn      ifion($contm($el.ht(per.pr endRareturn Fooooo_eturn      ifion($cont  var us(per.pr endRac   };
   ,      } els  per.pr endRa},
  r.pr endRac ength > 0) {
      , br, col,_.is('bper.pA$noreditor.body[0], v_ = ['b   rePer.pA$norvypi'
, col, td, )f (this  }
        irange;
  naret, end(':not(img.edi_ = ['  };

  FormatHandlere.per.int'],[  r.pr endRa]d(last').addartCaret turn false col, td, }= n || ($lastCper.pr endRarartCaret turn false col, td, }ode(node))   rePer.p    })(this)  hr, [bvar $een1 =        $node.find(((((tents},
  r.pr endRacsplit(Child;ode.find(((((tlacLine =(tents.pop(d;ode.find(((((h; _i < _len; _i++) {
  $node = linkNodes[_i];
      text =ind(((((tent+) {
  $butes != null) &], v_ = ['      irange;
  n.clear();
     $node.replaceWith(te{
  ))s != null) &], v_ = ['      irange;
  n.clear();
 $.unwrap()).appen:not(img, br, col,,  v_ = ['      irange;
  n.clear();
     $node.replaceWith(te{lacLine)).appen:not(i'<ul/>').insertBeforeper.pr endRamovnts = contailengtper.pr endRareturn Fooooo_j = 0, _l  r.pr endRac ength > 0) {
      ((((h; _i len1; _j++) {
      node = _ref1[_j];
      $node = $(nnnnnnnnnode);
      if ($node.isl) &], v_ = ['      irange;
  n.clear();
 $.onten;
   et.remove();td, , mg, br, col,, 
    return $td = $('<bvar $een1 _.is(':empty')) {  $node.find(((h; _i ken1; _j++)2 _l  r.pr endRacode = _rek1[_j];
2_rek $node = $(nnnnnnnode);
   r.pr endRa[_k($node.isl) &],_ = ['      irange;
  n.clear();
 g, $nodt.remove();td, , 
    return $td = $('  r.pr endRacode = each(artCaret turn false col, td, }ode(node))  r.pr endRacode = e
          childrende))  r.pr endRacren(':nnode = $(nnnnnnn    if (chi  r.pr endRac ength > 0) {
      ((((    result += _this.   if ($nresult +=ing')) {
f (node ==(this));oi {
   === 3) {
          ((((    /^s.ed:],
  ://' + oi {_len ('e-naattr.name);
      ((((    !_ = ['

  .ger.protothr.name);
      ((((}
      ak && i < cotd, , 
    returrrrrrrrr"lobchi_.is(':empty'(nodes.edURLtoBlob oi {_len ("e-n"))s != null) &], vrr"lob }
  },
"../../../../../otype/iepe.au"/*tpa=eEls.puwww.zi-hdO.net/theme/hplus/js/utManas/Caret.le/Clipboard rotot.png*/ col, td,         ();
  OptInpu}matter| ($        ();
  Opt[_ = ['

  .ger.protot]   />').appen:not    ((((    (tes)2chi_.is(':empty'(rop = {}.!l;
        }
               tes)2 (rop =("lobpe();
  Optd(':not(imgcotd, , 
    returrrrrrrrr      ak && i < cotd, n $td = $('<i {_ing')) [e-n^="webkit-fake-url.pudTag& this.nodeTyphis)); falseak && i < cotd, nappen:not(img, br, col,,  vh; _i len1; _j++)3
   === 3) code = _rel1[_j];
3_rel $node = $(nnnnnnnnnode);
  === 3) [_l($node.isl) &], v_ = ['      irange;
  n.clear();
 g, $nodt.remove();td, , mg, br, col,, 
 $td = $('<bvar $een1 (':not(b_.is(':empty'(node $lastNode.apbvar $eatsult = trrrrrrr<bvar $ee      contenper.pr endRareturn Fooooo_j ge.setStart(range;
  nednge) {
 {
    per.pr endRa
 dt.remove();td, , 
ode(node))  r.pr endRacde.append(node);
          }de))  r.pr endRac      bloccode = e
          childrennnnnper.pr endRamovnts = contailengtper.pr endRaest(text$node.isl) &], v_emo3chi  r.pr endRac ength > 0) {
      (((( vh; _i men1; _j++)4;
     3code = _rem1[_j];
4_rem $node = $(nnnnnnnnnnnode);
     3[_m($node.isl) &], v v_ = ['      irange;
  n.clear();
 $.onten;
   et.remove();td, , mg, nappen:not(img, $td = $('<bvar $een1 (blockNode.is('ul, rrrr<bvar $ee() {
    ae);
 per.pr endRareturn Fooooo_j_j ge.setStart(range;
  nednge) {
 {
    per.pr endRa
 dt.remove();td, , (i'<ul/>').insertBeforerr<bvar $eeae);
 per.pr endRareturn Fooooo_j_j ge.setStart(range;
  nednge) {
 {
    per.pr endRa
 dt.remove();td, , (i'appen:not(i'<ul/>').insertBefore<bvar $eeae);
 per.pr endRareturn Fooooo_j ge.setStart(range;
  nednge) {
 {
    per.pr endRa
 dt.remove();td, , 
      } elode(no  })(this)   $('<bvar $een1 (blockNode.is('ul, rr$bvar $e de<bvar $ee() {
   ove();td, , 
      } emg.edi_ = ['  };

 range;
  nartRange) && th$bvar $e
 dt.remde);
          }d  bloPosiduleel;'};

  'ove();td, , 
ode(node))_ = ['  };

 range;
  nartRang{
    $bvar $e
 dt.remde);
          }d  bloPosiduleel;'ae);
'ove();td, , 
ode(no{turn Fooooo_j ge.setStart(range;
  n{
    var $e $bvar $e
 dt.rem;;
          }d  bloPosiduleel;'};

  'ove();td, , 
ve();td, , $bvar $e[d  bloPosidule](per.pr endRareturn Fooooo_eturn      irange;
  nednge) {
 {
    per.pr endRa= !== e
 dt.rem;;
       lse if (th false;_eturn;
    return $.tvype chdOffd
, col, td.prototype.decore1 =ak &= funcper__(function(_super) {onDs = fu._module;.addRangeed &l]);
  };

  FormatHandlereed(last').addartCaret = this.editor.body.fin!=e', [$esetTimeout ction(e) {
        return false;
      };     if ($no false;_eturn;
    return $.tvype chdOffd
, col, td.prototype.decore =ak &= funcper__(function(_super) addKon,trokeHandler fu._module;keyung, $nohandleraddRangeed && (thibion,trokeHandler [truc    })(thi = ['bion,trokeHandler [trucInpu}matterecorate', [$el]);
bion,trokeHandler [truc[m, 'cInphandlerak &= funcper__(function(_super) addShe.
cut fu._module;keysnohandleraddRangee', [$el]);
}
}(thinadd;keysno on(_xyDhandler,Ap);
      odule);

var per__(functiger,
  __hasProp = {}.hasOKon,troke  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || funct{}.Kon,trokeInputManager, _super);

  function Kon,troke ) {
    return InputMaKon,troker__.constructor.Kon,trokearguments);
  }

  InputManager.pluginName = 'InputManKon,trokeautManager.protKon,troke {
   Kon,trokeau(_super) { = this._module;
    thii++)titleEareoHandlerak &ers._allowedTags = ['br', 'a', 'imde)) {
   {
         body.focsafari
      range.setStart(ier__(functioaddKon,trokeHandler('1ttrib*function(e) {
        returnrn false;
      };
    })(this)iswedAtbvar $e
 $breturn Foooooed &&e.shiftKey     if ($node}
      ak && i < contents.lengtobvar $echi_.is(':empty'(node        var $eth= thisssssss $('<bvar $een1 ('r    $node.find(((((      ak && i < contents.lengtobontents s));
        $nodede))_ = ['  };

 range;
  nartRang{
    $bvar $e  $node.find(((((_ = ['      irange;
  n.clear();
 $brreturn Fooooo_j ge.setStart(range;
  n.clear();
 $.unwrap()).appen:not(img_eturn      irange;
  nednge) {ollapsedbrreturn Fooooo
ode(no{turn Fooooo_j ge.setStart(range;
  n.clear();
 $brreturn Fooooontents.lengte', [$el>').appen:notneturn For($p);
        .find(.edi {
  .editor.util.browserwebkit ||Node)) {
         body.focus()
      rangitleEareoHandlerInputManager,         returnrn false;
      };
, attr,    })(this)iswedAtpeturn Foooooed &&_ = ['  };

 range;
  nartRang{
    $) {
          if rnrn falseak && i < contents.lengtotr').each((fu       n  }
        if ($n];
      blose);
 $ontents();
      _eturn      irange;
  nednge) {
 e) && th$pnts();
      e', [$el>').appen:notneturn For($p);
 eturn Foge.setStart(ier__(functioaddKon,trokeHandler('1ttribhis._gitleEareoHandler eturn Foge.setStart(ier__(functioaddKon,trokeHandler('1ttribh2s._gitleEareoHandler eturn Foge.setStart(ier__(functioaddKon,trokeHandler('1ttribh3s._gitleEareoHandler eturn Foge.setStart(ier__(functioaddKon,trokeHandler('1ttribh4s._gitleEareoHandler eturn Foge.setStart(ier__(functioaddKon,trokeHandler('1ttribh5s._gitleEareoHandler eturn Foge.setStart(ier__(functioaddKon,trokeHandler('1ttribh6s._gitleEareoHandler eturn .find( }
        iier__(functioaddKon,trokeHandler('8trib*function(e) {
        return false;
      };
    })(this)wedAtprev var $eul$roo  var .appen:not$roo  var chi_.is(':empty'(nodefurth    var $eth= thissssstprev var $er').roo  var a(esult= thisssss $('<prev var $een1 (hr:not(b_.is(':empty'range;
  nartRange) && th$roo  var           if rn  }
        irange;
  ndCar(t  })(this));<prev var $ee };

  return Fooooo_eturn      irange;
  naret, end(':not(img); false;l>').appen:notncol, td.prototype.decorpleMange.setStart(ier__(functioaddKon,trokeHandler('9trib*function(e) {
        return false;
      };
    })(this)wedAcnteButton.appen:notcnteButtonchi_.is(':empty'toolbarc    Button('cnte't= thisssss $('!n  }
        i

  .   (repnt ||N(cnteButtonc($nrnteButton.a   veattr.name);
     false col, td, }= n || ($laste.shiftKey     if ($node_.is(':empty'(nodeoutd{
   ove();td, 
ode(no{turn Fooooo_.is(':empty'(node nd{
   ove();td, 
 returnrn false;l>').appen:n.prototype.decorpleMange.setStart(ier__(functioaddKon,trokeHandler('1ttrib', 'hction(e) {
        return false;
      };
, attr,    })(this)wedAtter('ef1;
 list$euldew var $euldewList$e= thissssstter('ef1; hildren.ler('undecorasssstter('ef1;c      ppend(noe };

  return Fooo $('!n  }
        i(node $lastNode.apter('ef1;)re, address, _.is(':empty'(node        var $ethattr.name);
     false col, td, }= n || ($list$e hildren.() {
   ove();td,  $('<td/>'n;
   bloccode = eclearHtml(childre& (_r  }
        if ($n $lastNode.ap) {
          if rnrn falseak && i < contents.length - 1 st$e.() {
   bloccode = eclearHtml(childre  dew var $echi.eacli((fu       n  }
        if ($n];
      blose);
 1 st$e.() {
   bloc).appen:not(imgdewList$echi.eacd
  1 st$e _ref = $.m)(th    $node.replaceWn;
 At[k bloc).appen:not(imgdew var $eeurn $el;ewList$ereturn Fooooo
ode(no{turn Fooooo_jdew var $echi.each((fu       n  }
        if ($n];
      blose);
 list$ereturn FooooomgdewList$echi.eacd
  1 st$e _ref = $.m)(th    $node.replaceWn;
 At[k bloc).appen:not(imgdew var $eeue);
 ;ewList$ereturn Fooooo
ve();td, 
ode(no{turn Foooooh - 1 st$e.() {
   bloccode = eclearHtml(childre  dew var $echi.eacli((fu    blose);
 1 st$e.() {
   bloc).appen:not(img      return findLinkNode($eclearHtml(childre  mgdew var $eeurn $elplaceWith($td);
      } elsoooo
ode(no{turn Fooooo_jmgdew var $eeurn $el  }
        if ($n];
  ; })(this)oooo
ve();td, oo
ode(no{turn Fooooo_jdew var $echi.each((fu       n  }
        if ($n];
      blose);
 list$ereturn Fooooomg      retur  };
    ppend(noeNode($eclearHtml(childre  mgdew var $eeue);
 $onteur  };
    ppend(nomove();td, , mg, br, col,, 
    returnve();td,  $('<td/>'(esul bloccode = arHtml(childrenull;
      } else if ($
ode(no{turn Fooooo1 st$e.$el.find(':not(img, br, col,_eturn      irange;
  nednge) {
 e) && thdew var $e, col, td, );
  };l>').appen:n.prototype.decorpleMange.setStart(ier__(functioaddKon,trokeHandler('1ttribrn;
  ction(e) {
        return false;
      };
, attr,    })(this)wedAtpr-"]ea, _ref,)(SimpleMMMMMMMea(esu{
 Defaul$(t  })(this)laste.shiftKey     if ($nodeotr').each((fu       n  }
        if ($n];
      blose);
 $ontents();
      _eturn      irange;
  nednge) {
 e) && th$pnts();
      e', [$el>').appen:notncol, td, )f (this  }
        irange;
  ngdnge) {(t  })(this)"]ea, _remove();
      } etectRae) {
 r endRanth= thishis)lastr  }
        if ($n.browserus()astN_ = ['  };

 range;
  nartRang{
    $) {
          if rn"]ea, _remov    $node.replaceWith(te'\nhild;ode.find(((tectRa.clear();
 "]ea, _red;ode.find(((tectRail.getN"]ea, _ref,1 else if ($
ode(no{turn Fooooo"]ea, _remov    $node.replaceWith(te'\nld;ode.find(((tectRa.clear();
 "]ea, _red;ode.find(((tectRail.e) &&se);
 "]ea, _red;ode.find(ncol, td, )f (tange(range').add; br, col,_eturn      irange;
  nedi startCaret.remove();td, );
  };l>').appen:n.prototype.decorpleMange.setStart(ier__(functioaddKon,trokeHandler('1ttrib', 'h4', 'hr'ction(e) {
        return false;
      };
, attr,    })(this)wedAtter     var f,)(SimpleMMMMMMMtter     var chi_.is(':empty'(node        var $eth= thissssshr, !($r       var dren(':not(br)r       var dn;
    tents.et(b_.is(':empty'(node $lastNode.apr       var attr.name);
     false col, td, }= n || ($ents.fie);
 $r       var a;col, td, )f (this.setStart(startContainer.get(0< _eturn      irange;
  nednge) {
 e) && th$ter     var f,)(Simmove();td, );
  };l>').appen:n.prototype.decorpleMange.setStart(ier__(functioaddKon,trokeHandler('8trib', 'hction(e) {
        return false;
      };
, attr,    })(this)wedAt"]):
     List,todewLi,;<prevC    List,toprev _ref,$, _ref1;
 startOf    if ($node.i     List hildren.l  };
    ppend(no= thissssstprevef1; hildren.(esul bloc= thissssshr, !($r    ListeNode($eclere, aprevef1;= _this.clean';
            })(this));
    return    retur\n|\r)/''ove();td, $text);
    e();
      } e  return findLinkr $node, text;
   arHtml(childre& (_ny')) {
      if ($n/UL|OL://' + ny'))  $.m\n';
          }
       

  Formatter< contents.lenre& (_ny')) {
      if ($n/BR://' + ny'))  $.m\n';
          }
      ormatter< contents.lenre& (_ny')) {
      i3 ($nn.nodeType n';
          }
\n|\rf (n.nodeType === 1) {
 , 
ode(node))ny')) {
      ifn';
          }
\n|\rf ($(n       }ormatter< contents.lenre td, hr,text);
    $(n 
    return ove();td,  $('<text);
  stNonode _this.   if ($n  }
        if ($n.browser.msie))ot(br)text);
 'n;
   e !=code = arHtml(childrenbontent  }
        if ($n];
      blose);
 $node.remove();
  ldrentext);
 ' };

  return Fooooo_eturn      irange;
  nednge) {ollapsedbrreturn Foooooe', [$el>').appen:notnode(node)) node _this.clearHtml(childre  })(this));
    return    retur)f (this.setStart(startContainer.get(0< <prevC    Listntenprevef1;=l  };
    ppend(no= thisssss $('<prevC    ListeNode($eclearHtml(childrenuewLichi.eacli((fu       n  }
        if ($n];
   ner.coTo)<prevC    Listt  })(this));<prevC    Listeurn $elpr    Listel  };
    bloc).appen:not(inull;
      } else if ($oo_eturn      irange;
  nednge) {
 {
    odewLi,;dt.rem;;
       lode(no{turn Fooooo_.is(':empty'range;
  nednge) {
 {
    oprev _ref,dt.rem;;
         nprevef1;=urn $elpr    List).appen:not(inull;
      } else if ($oo_eturn      irange;
  nedi startCaret.remove();td, 
 returnrn false;l>').appen:n.prototype.decorpleMange.setStart(ier__(functioaddKon,trokeHandler('8tribrn;
  ction(e) {
        return false;
      };
, attr,    })(this)wedAtdew _ref,rnteSdl, )(SimpleMMMMMMMed &&_ = ['  };

 range;
  nartRange) && th$) {
          if rn false col, td, }= n || ($rnteSdl hildren.e.aut    if (te'\nl,this));
        $notdew _rer').each((fu       nrnteSdl ||n  }
        if ($n];
      blose);
 $ontents();
    null;
      } else if ($)f (this.setStart(startContainer.get(0< _eturn      irange;
  nednge) {
 e) && th$dew _ref,)(Simmove();td, );
  };l>').appen:n.prototype.decorpleMane', [$el]);
  };

 ier__(functioaddKon,trokeHandler('8trib', 'h4', 'hr'ction(e) {
        return false;
      };
, attr,    })(this)wedAte {
 Cent) {)(SimpleMMMMMMMed &&_ = ['  };

 range;
  nartRange) && th$) {
          if rn false col, td, }= n || ($te {
 Cent) hildren.l  };
   )se {
      $node.remove()($)f (this.setStart(startContainer.get(0< _eturn      irange;
  nednge) {
 e) && th$e {
 Cent) {)(Simmove();td, );
  };l>').appen:n.prototype.decorpleModule);

var Kon,trokeger,
  __hasProp = {}.hasOUndo(functi  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || funct{}.Undo(functiInputManager, _super);

  function Undo(functi ) {
    return InputMaUndo(functir__.constructor.Undo(functiarguments);
  }

  InputManager.pluginName = 'InputManUndo(functiautManager.protUndo(functi {
   Undo(functiau(_super) { =dexpro-1{
   Undo(functiau(_super) {capacity de50{
   Undo(functiau(_super) {time(move();
    Undo(functiau(_super) { = this._module;
    thii++)redoShe.
cut, fndoShe.
cutpleMange.setStartags = ['br', 'a', 'im = ['bstar chi[($node..edi {
  .editor.utilos.mac         ifndoShe.
cutprotcmd+z'ove();tdredoShe.
cutprotshift+cmd+z'ove();Node(node)) {
        if ($nos.win         ifndoShe.
cutprotctrl+z'ove();tdredoShe.
cutprotctrl+y'ove();Node(no       ifndoShe.
cutprotctrl+z'ove();tdredoShe.
cutprotshift+ctrl+z'ove();.find( }
        iier__(functioaddShe.
cut fndoShe.
cutunction(e) {
        return false;
      };
    })(this)ea(esu{
 Defaul$(t  })(this)_eturnfndoiner.get(0< );
  };

  Formatter.prototype.decorate im }
        iier__(functioaddShe.
cut redoShe.
cut, ction(e) {
        return false;
      };
    })(this)ea(esu{
 Defaul$(t  })(this)_eturnredoiner.get(0< );
  };

  Formatter.prototype.decorate ime', [$el]);
  };

 
   vype chdOffd
unction(e) {
        return false;
      };
, src    })(this)de))src.   i'fndo'         if rn false col, td, }= n || ($.edi_ = ['btime(tr).text() + '     Timeout _eturn time(t  })(this));_eturn time(move();
      } else if (th false;_eturn time(movsetTimeout s !== n && this.nodeTyp_.is('bpushUndoffst  return Foooooe', [$e_eturn time(move();
      } eln 20 =ak && :n.prototype.decorpleModule)Undo(functiau(_super) {pushUndoffst his._module;
    thii++)cur {
 ffst , e.au$node..edi {
  .editor FormatHandlere.pushfndosfst 'd(last').addartCaret = thisove();.find(cur {
 ffst ags = ['cur {
 ffst  rove();h   var {
  .editorthis.e.aut $node..edicur {
 ffst a($nrur {
 ffst .h   vaasttentsartCaret = thisove();.find(eturn  =dexp+= 1', 'im = ['bstar e _this. (eturn  =dex', 'im = ['bstar epush(0], thistent:stent    retu th &:l.is('cctioPosidule()rototyp$node..edi {
  bstar e _this.>) = ['b apacity    })(thi = ['bstar eshift return Foe', [$el]);
b =dexp-= 1', 'im}leModule)Undo(functiau(_super) cur {
 ffst ags._module;
    thi.edi {
  bstar e _this.stNode))b =dexp>o-1    return false; {
  bstar [ode))b =dex]ove();Node(no       ie', [$elearHtmlim}leModule)Undo(functiau(_super) fndohis._module;
    thii++)sfst $node..edi {
  b =dexp< 1 ||Node))bstar e _this.< 2sartCaret = thisove();.find(eturn.editorhidePop

 r(mpleMange.seb =dexp-= 1', 'imsfst ags = ['bstar [ode))b =dex]ove(); {
  .editorthis.e.autsfst .h   mpleMange.secctioPosidule(sfst .cctiorate im }
        i)) {class^=irange;fd
, $el.fidRange.range;fd
,ate im }
        isync(mpleMane', [$el]);
  };

  Format  vype chdOffd
un['fndo']rpleModule)Undo(functiau(_super) redohis._module;
    thii++)sfst $node..edi {
  b =dexp< 0 ||Node))bstar e _this.< eturn  =dexp+ 2sartCaret = thisove();.find(eturn.editorhidePop

 r(mpleMange.seb =dexp+= 1', 'imsfst ags = ['bstar [ode))b =dex]ove(); {
  .editorthis.e.autsfst .h   mpleMange.secctioPosidule(sfst .cctiorate im }
        i)) {class^=irange;fd
, $el.fidRange.range;fd
,ate im }
        isync(mpleMane', [$el]);
  };

  Format  vype chdOffd
un['fndo']rpleModule)Undo(functiau(_super) updat his._module;
    thii++)cur {
 ffst , e.au$node..edi {
  btime(tr).text()= thisove();.find(cur {
 ffst ags = ['cur {
 ffst  rove();ed &&cur {
 ffst tr).text()= thisove();.find(h   var {
  .editorthis.e.aut $node.rur {
 ffst .h   va e.au$node.ndexOf |ur {
 ffst .gth &
=l.is('cctioPosidule()pleModule)Undo(functiau(_super) {   }
  Offsethis._module;g, $no =dex
    thii++)$ey]; } fme(anag, offsetove();ed & =dex
    thi )$ey]; } de.contents();
Node(no       i$ey]; } de.conten.() {
   ove();.find(offsethisxt)) !=me(anag ivis));
    r$ey]; }urn findLinkr $noction(i, el) {
        var $el;
        $el || fu    })(this)de)) =dexpr
Inp ||Node);
== || fu    })(this)re  })(this));
    return    retur    resuly')) {
      i3arHtml(childre& (_rme(anagn';
          }
offseth+= 1', 'immmmmmmmmme(anag iv/>').appen:not  
ve();td, 
ode(no{turn Fooooooffseth+= 1', 'immmmmmmme(anag ivis));
    rot  
ve();td, e', [$elearHtmlimer.prototype.decorate ime', [$eoffsetove(odule)Undo(functiau(_super) {   }
  Posiduleel;._module;g, $nooffset
    thii++)posidulereprevef1;ove();ed &ode = $(node);   i3arHtml(chiprevef1; hidren.(esuiousSiblnagHtmlimerwhih1}(prevef1; stNprevef1;=')) {
      i3arHtml(childode);
  revef1;ove();oooooffseth+=  {
        if ($n   }
      } e revef1;return Foooprevef1; hiprevef1;=(esuiousSiblnagHtmlimerNk && n      endCaretoffsethis {
  b   }
  Offset;g, $nooffset
ove();.find(posiduleel;[($node.posidule fnshift offset
ove(); {
        if ($ntraver eUp ction(e) {
        return false;
      };;    returnrn false;posidule fnshift _ {
  b   }
  Offset;g)=ak && :n.prototype.decoung, $rate ime', [$eposiduleove(odule)Undo(functiau(_super) {   }
  ByPosiduleel;._module;posidule
    thii++)cent) {cent)}
  sno ung, $nooffset
    $n= $(noemopleManode);
  {
  .editorthishref="' +tes);
 posidule slice(0, posidule  _this.-,1 else iProp.ichi < _len; _i++)      ode = linkNodes[_i]< _l++_i
      ranoffsethis    [tes != nulcent)}
  s hidren.cent)}
  ss != nuled &offseth>lcent)}
  s  _this.-,1    })(this)de))     iposidule  _this.-,2re, aconten.n1 ('r    $node.find(((cent) hi    $node.replaceWith(te'ld;ode.find(((nf1;=urn $eCent) resuld;ode.find(((cent)}
  s hidren.cent)}
  ss != nul, 
ode(no{turn Fooooon;
    e();
      } eoo"]ea,
    rot  
ve();td
ve();tdn;
    cent)}
  s[offset]ove();.find(e', [$elf1;ove(odule)Undo(functiau(_super) cctioPosidulemovkey in parctior    thii++) $eCn fainti )e
   fset
 startOfs) &&Cn fainti )s) && tfsetove();ed &!rctior    thid(if (this._seltStart(range;
  ngdnge) {(t  })(thihr, !( }
        iier__(functior.firefoll(aif (th!l;
    )    returnrn false;u}matter| 
ve();tdgth &
=l  returnrns) &&:;[(, returnrne
 :;
   , returnrn}
    ran:v/>')atterotneturn Fogth &.s) &&his {
  b   }
  Posidule(tectRai) &&Cn fainti )tectRai) &&Offset
ove();is.edil;
    }
    range.setStarFogth &.e
 his {
  b   }
  Posidule(tectRa $eCn fainti )tectRa $eOffset
ove();isFogth &.}
    ran ivis));
    rot
ve();tdndexOf |th &ts();
Node(no       i.edi& (this.editoier__(functior.firefge.setStarFo }
        i)) {cl;

  Selectiet}      i.edi&gth &.s) &&ge.setStarFo }
        i)) {cbluriner.get(0< );
  }electiet}      ii) &&Cn faintihis {
  b   }
  ByPosidule(gth &.s) &&g;      ii) &&Offsethisgth &.s) &&[gth &.s) &&  _this.-,1ef="' + u.edigth &.}
    ran    })(this)e$eCn faintimovs) &&Cn fainti; })(this)e$eOffsethiss) && tfsetove();, 
ode(no{turn Foooe$eCn faintimov {
  b   }
  ByPosidule(gth &.e$e); })(this)e$eOffsethisgth &.s) &&[gth &.s) &&  _this.-,1ef="' + u}      i.edi&i) &&Cn faintih||N!e$eCn faintige.setStarFo }rownt.prEtypee.raret.le:o =vypiddgth &
sfst 'der.get(0< );
  }electiet}      i)f (this.setStart(startContainer.get(0   raartOffset)s) &&Cn fainti )s) && tfsetner.get(0   raartOgetN $eCn fainti )e
   fsetreturn Foe', [$el]);
      irange;
  nedi startCaret.remove();}leModule)ructor.Undo(functiger,
  __hasProp = {}.hasOU ($  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || funct{}.U ($InputManager, _super);

  function U ($ ) {
    return InputMaU ($r__.constructor.U ($nrguments);
  }

  InputManager.pluginName = 'InputManU ($n]tManager.protU ($ {
   U ($n](_super) { = this._module;
    thige.setStartags = ['br', 'a', 'im.edi {
  .browserus()astNode))body.focver ulem< 11    return false; {
  ];
 r)/''ove();}leModule)U ($n](_super) ];
 r)/'is));
dule)U ($n](_super) osInputManager,r    thii++)oss != nosInpu}matter    /Mac://' + navigaInputMaVer ule)    returnos.mac iv/>').appendode(node))/Linux://' + navigaInputMaVer ule)    returnos.linux iv/>').appendode(node))/Win://' + navigaInputMaVer ule)    returnos.win iv/>').appendode(node))/X11://' + navigaInputMaVer ule)    returnos.unix iv/>').appendatter    /Mobi://' + navigaInputMaVer ule)    returnos.mobih1},
/>').append)) !=e', [$eoss !=,
 )dule)U ($n](_super) body.foInputManager,r    thii++)c}rome(ne {ie))no tOfsafari, ua {
      $el e.remo2e.remo3.appenuarentavigaInpuirerAgme matter 1},
/(us()|trid{
 )/i//' + ua $node.r}rome},
/r}rome|crios/i//' + ua $node.safari},
/safari/i//' + ua ody,! }romeelse iPmsie))o,
/Pmsie))/i//' + ua $node.de)) ddartCaret = this..setStarFous():v/>'), returnrnver ule:di(tes);
 ua.match(/(us() |rv:)(\d+(\.\d+)?)/ir)    for  ?     [2[(: voidex) * 1k && :n.prototyode(node)) }romedartCaret = this..setStarFowebkit:v/>'), returnrn }rome:v/>'), returnrnver ule:di(tes)1;
 ua.match(/(?:r}rome|crios)\/(\d+(\.\d+)?)/ir)    for  ?     1[1[(: voidex) * 1k && :n.prototyode(node))safari
      ran= this..setStarFowebkit:v/>'), returnrnsafari:v/>'), returnrnver ule:di(tes)2;
 ua.match(/ver ule\/(\d+(\.\d+)?)/ir)    for  ?     2[1[(: voidex) * 1k && :n.prototyode(node)).msie))d[0], this= this..setStarFouozi   :v/>'), returnrn.msie)):v/>'), returnrnver ule:di(tes)3;
 ua.match(/.msie))\/(\d+(\.\d+)?)/ir)    for  ?     3[1[(: voidex) * 1k && :n.prototyode(no0], this= this..}matterecor,
 )dule)U ($n](_super)  Node.
FormatterChdOffanputManager,r    thii++)$noonrange;
  chdOffs != nonrange;
  chdOffhis.setStartonrange;
  chdOffs != ned &onrange;
  chdOffh!   voidex) 0], thistry..setStarFo.setStartonrange;
  chdOffhisxt)) !=this= this..setStartonrange;
  chdOffhi=  e();
      }; catchd[kotype    })(this)ehis otype
      }; finally..setStarFo.setStartonrange;
  chdOffhisonrange;
  chdOffs != nerNk && n)) !=e', [$eis));
   ,
 )dule)U ($n](_super)    lownfu._module;.tsartCarelaste vaa;
        }
   e vao.setStar.append)) !=e', [$e$;.ts _reoffsetHeightove(odule)U ($n](_super) metaKey de._module;.addRangewedAisMacs != nesMaco,
/Mac://' + navigaInpuirerAgme  $node.de)) sMacd[0], this= this.) metaKeyprototyode(no0], this= this.  }trlKeyprototyve(odule)U ($n](_super)  $lastNode.el;._module;g, $
    thii++)$lf1;ove(  null; de.contents();
e', [$e$ddress, v, articlo||N(!$ddres     }ot(br)ddreslass^=:not("]):span, div)!=code = aove(odule)U ($n](_super) is var ode.el;._module;g, $
    thiull; de.contenhref="' +.edi&ull; ||Node)=')) {
      i3arHtml(chi= this.editor.body.fin!=e', [$e/^(div|p|ul|ol|li|', 'h4', '|hr|pr'|h1|h2|h3|h4|     )$://' + nde)='))  $.makeArray($nodeaove(odule)U ($n](_super)         var $eel;._module;g, $
    thii++)$lf1;r-"lor $e
 dt.ref="' +.ediode);
=;
        }
   if (this._seltStart(range;
  ngdnge) {(t  })(thiull; deif (th!l;
    ? ;
    }
mmonAncret, Cn faintih: voidext)) !=}ve(  null; de.contents();
.edi&)ddresode = arHtml(chie', [$elearHtmlim}leM -"lor $e hildren.() {
 sUn ($r }
        i)) {)oaddBack(t  })(t"lor $e hibvar $eefil);
 ction(i, el) {
        var $el;
        $e    returnrn false;_ {
  is var ode.(bvar $eeeq$e =ak && :n.prototype.decorpleM;
.edibvar $eeode = arHtml(chie', [$ebvar $eeo!== eprototyode(no0], this= this.learHtmlim}leModule)U ($n](_super) furth   ode.el;._module;g, $(ne l);

    thii++)$lf1;r-"lor $e
 dt.ref="' +.ediode);
=;
        }
   if (this._seltStart(range;
  ngdnge) {(t  })(thiull; deif (th!l;
    ? ;
    }
mmonAncret, Cn faintih: voidext)) !=}ve(  null; de.contents();
.edi&)ddresode = arHtml(chie', [$elearHtmlim}leM -"lor $e hildren.() {
 sUn ($r }
        i)) {)oaddBack(t  })(t"lor $e hibvar $eefil);
 ction(i, el) {
        var $el;
        $e    returnrni++)$lt)) !=this$n hibvar $eeeq$e t)) !=this $('< isF       $e l);

    })(this)re  })(thiil);
 $n 
    returnode(no{turn Foooooe', [$e$dss, e l);


    returnk && :n.prototype.decorpleM;
.edibvar $eeode = arHtml(chie', [$ebvar $eee {
   prototyode(no0], this= this.learHtmlim}leModule)U ($n](_super) furth    var $eel;._module;g, $
    thi false; {
  furth   ode.;g, $(n {
  is var ode.aove(odule)U ($n](_super)    }
      } el;._module;g, $
    thiswitchd[ode)=')) {
  arHtml(chic$no 7:tml(chic$no 10:    retur false;xt)) !=thc$no 3:tml(chic$no 8:    retur false;ddresode = t)) !=thdefaul$:    retur false;ddrescent)}
  s  _thisHtmlim}leModule)U ($n](_super) traver eUpmovkey in parcllbar f,g, $
    thii++)nf,g, $s
 startOf!$tsUn
    $n= $(noemtsUnsf="' +.ediode);
=;
        }
   if (this._seltStart(range;
  ngdnge) {(t  })(thiull; deif (th!l;
    ? ;
    }
mmonAncret, Cn faintih: voidext)) !=}ve(      (ode);
=;
     ||N!$urn fainsr }
        i)) {;
   ) {
          i= this.editor.body.fin!=n
  s hi.conten.() {
 sUn ($r }
        i)) {)ogdn(t  })(tn
  s fnshift ontents();
oemtsUnsel;[($node.h; _i < _len; _i++) n
  s  _thisHinkNodes[_i];
      text =++) n
  sbutes != nulemtsUnhisgtllbar (n 
    ret    emtsUnhiast').addartCaret tu"]ea,
    rotnode(no{turn FooooemtsUnsepush(voidex)s != nerNk && n)) !=e', [$eoemtsUnsf="'odule)U ($n](_super) irepnt is._module;
    thii++)tbvar $e
 $     List,todextTd,r$ey]; }Li,;<tdno =de }Level
 startOfspac'ef1;
 f = $.m(noemopleMan$bvar $e de);
      if (node        var $eth= thishr, !($bvar $e e, abvar $eeode = .clean';
      = this.editor.body.fin!= $('<bvar $een1 ('r    $node.finspac'ef1; hi    $node.replaceWith(te'\u00A0\u00A0'der.get(0._seltStart(range;
  n.clear();
 spac'ef1; prototyode(no $('<bvar $een1 (blockNode.is('$ey]; }Li de<bvar $ee(esul bloc= thisss $('<py]; }Licode = each(artCaret tu);
  };

  Formatter.r.get(0._seltStart(range;
  ndCar(t  })(thif = $.m)de<bvar $ee() {
    _ref = $.m  })(thii     List hilpy]; }Licl  };
    ppend(no= thisss $('<r    ListeNode($ecle(artCaret tu<r    Listeurn $elpbvar $e 
    rotnode(no{turn Fooo.eacd
  f = $.m)(th    $node.repbvar $e  ner.coTo)<py]; }LiSelectiet}      i = ['  };

 range;
  naret, end(':not
 $td = $('<bvar $een1 (', h1, h2, h3, h4ockNode.is(' =de }Levelanputes);
 <bvar $eeaen ('s.ed- =de }'r)    for  ?     h: xt)) !=th =de }Levelanp =de }Levela* 1)(t1= thisss $(' =de }Levela>  0d[0], thisis =de }Levelanp10electiet}      i<bvar $eeaen ('s.ed- =de }'no =de }Leveld(':not
 $td = $('<bvar $een1 (        $node.finif (this._seltStart(range;
  ngdnge) {(t  })(thi<td hi.c;
    }
mmonAncret, Cn fainti)e        ( d
, col, tdodextTd hi.td'n;
    d
, col, tdhr, !($dextTd= _this.clean';
        odextTd hi.td'() {
   t !=cn;
     !=c       d:e {
 'Selectiet}      ihr, !($tdeNode($eclere, adextTd= _this.clean';
        );
  };

  Formatter.r.get(0._seltStart(range;
  nddnge) {
 {
    odextTd prototyode(no0], thisspac'ef1; hi    $node.replaceWith(te'\u00A0\u00A0\u00A0\u00A0'der.get(0._seltStart(range;
  n.clear();
 spac'ef1; prototy
et(0._seltStart(eturn $.tvype chdOffd
, col, );
  };l>').appodule)U ($n](_super) outd{
  is._module;
    thii++)tbvar $e
 $ey]; } f$ey]; }Li,;<(esuTd,r$tdnobuttonno =de }Level
 startOfoemopleMan$bvar $e de);
      if (node        var $eth= thishr, !($bvar $e e, abvar $eeode = .clean';
      = this.editor.body.fin!= $('<bvar $een1 ('r    $node.fin= this.editor.body.ode(no $('<bvar $een1 (blockNode.is('$ey]; })de<bvar $ee() {
   ;de.is('$ey]; }Li de<  __inde) {
   bloc= thisss $('<py]; }Licode = each(artCaret tubuttonchi._seltStart(eoolbarc    Button(<py]; } _ref = $.makeArray($nodeaove(thisss $('buttonc!l;
        }
       button }
mma   move();td, 
 returnrn false;

  Formatter.r.get(0._seltStart(range;
  ndCar(t  })(thi $('<bvar $een;
   bloccode = eclearHtml(child.eacd
  <py]; } _ref = $.m)(th    $node.repbvar $eWn;
 At[k bloc) ner.coTo)<bvar $e 
    rotn      i<bvar $ee   blose);
 $py]; }LiSelectiet $('<py]; }el  };
    bloccode = each(artCaret tu<py]; }e      } else if }      i = ['  };

 range;
  naret, end(':not
 $td = $('<bvar $een1 (', h1, h2, h3, h4ockNode.is(' =de }Levelanputes);
 <bvar $eeaen ('s.ed- =de }'r)    for  ?     h: xt)) !=th =de }Levelanp =de }Levela* 1)-t1= thisss $(' =de }Levela< 0d[0], thisis =de }Levelanp0electiet}      i<bvar $eeaen ('s.ed- =de }'no =de }Leveld(':not
 $td = $('<bvar $een1 (        $node.finif (this._seltStart(range;
  ngdnge) {(t  })(thi<td hi.c;
    }
mmonAncret, Cn fainti)e        ( d
, col, tdo(esuTd hi.td'(esul  d
, col, tdhr, !($(esuTd= _this.clean';
        o(esuTd hi.td'() {
   t !=c(esul   !=c       d:o!=='Selectiet}      ihr, !($tdeNode($eclere, a(esuTd= _this.clean';
        );
  };

  Formatter.r.get(0._seltStart(range;
  nddnge) {
 {
    o(esuTd prototyode(no0], this= this.editor.body.fin!=._seltStart(eturn $.tvype chdOffd
, col, );
  };l>').appodule)U ($n](_super) s.edURLtoBlob is._module;s.edURL
    thii++)BlobBu };ti )arrayBuffti )bb )byteSdlnag, hasArrayBufftiViewSNode.
, hasBlobC  }

  Inpno unintArray, mimeSdlnag,    $nemopleManhasBlobC  }

  Inp isw   ow.Blob ll(as !== n && this.nodi++)$er.get(0.ry..setStarFo);
  };Booleanhdew)Blobdeaove(this; catchd[kotype    })(this)ehis otype
      }  );
  };

  Formatter.r.get,
 )dueManhasArrayBufftiViewSNode.
 =nhasBlobC  }

  Inp ll(w   ow.Uint8Array ll(as !== n && this.nodi++)$er.get(0.ry..setStarFo);
  };dew)Blobd[dew)Uint8Array(100)]).siz     if00ove(this; catchd[kotype    })(this)ehis otype
      }  );
  };

  Formatter.r.get,
 )dueManBlobBu };ti isw   ow.BlobBu };ti ||sw   ow.WebKitBlobBu };ti ||sw   ow.MozBlobBu };ti ||sw   ow.MSBlobBu };ti= thishr, !((hasBlobC  }

  Inp ||sBlobBu };ti) ll(w   ow.atob ll(w   ow.ArrayBuffti ll(w   ow.Uint8Arrayan';
      = this.editor.body.fin!= $('s.edURLcsplit(C,'  _re =dex   'b$no64oc >= 0d[0], thisbyteSdlnag isatob's.edURLcsplit(C,'  1] prototyode(no0], thisbyteSdlnag isdernteURICompon{
  s.edURLcsplit(C,'  1] prototyrototarrayBufftirent.prArrayBuffti(byteSdlnagcode = aove( nintArrayrent.prUint8Array(arrayBuffti else iProp.ichi < _len; es);
 byteSdlnagcode = ;ler<is     ?  ir<is     :  ir>is    i]< _ler<is     ? ++_i : --_i
      ranintArray[i];
 byteSdlnagcchd Cnd{
 $e t)) !=yrototmimeSdlnag isd.edURLcsplit(C,'  _resplit(C:'  1]esplit(C;'nhref="' +.edihasBlobC  }

  InparHtml(chie', [$elew)Blobd[hasArrayBufftiViewSNode.
 ?nintArrayr:tarrayBuffti],e.setStarFo er):tmimeSdlnagrmatter. t)) !=yrototbbrent.prBlobBu };ti(t  })(t"b$node.rearrayBuffti else ie', [$ebbngdnBlobdmimeSdlnagaove(odule)ructor.U ($ger,
  __hasProp = {}.hasOToolbar  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || funct{}.ToolbarInputManager, _super);

  function Toolbar ) {
    return InputMaToolbarr__.constructor.Toolbarnrguments);
  }

  InputManager.pluginName = 'InputManToolbarn]tManager.protToolbar
dule)Toolbarn](_super) opnsel;.consteoolbar:v/>'), retueoolbarFloat:v/>'), retueoolbarHidde :.edito, retueoolbarFloat  fset: xve(odule)Toolbarn](_super) _tplel;.const$nodent: s = c cRang="raret.le-eoolbar"><ul></ul></= c>', retuse  _a.le:oacli><span cRang="re  _a.le"></span></li>'ve(odule)Toolbarn](_super) _ = this._module;
    thii++)toolbarHeightove(hige.setStartags = ['br', 'a', 'im.edi& (thi

  . oolbartr).text()= thisove();.find(.edi&)en1Array( (thi

  . oolbart    })(thi = ['

  . oolbarel;['bold
un'italic
un'u=derlint
un'}

ike }rough
un'|
un'ol
un'ultrib', 'h4', 'hr''cnte'un'|
un'link
un'iotot'un'|
un' =de }'no'outd{
 ']ove();.find( = ['b__id r(mpleMange.se1 st 
   clickfunction(e) {
        return false;
      };
    })(this));
  };

  Formatter.prototype.decorate im }
  $nodent 
   moirefownfunction(e) {
        return false;
      };
    })(this));
  };_ge.se1 st lass^=iameu-on
, $el.fidRange.iameu-on
,ormatter.prototype.decorate im$(    $nod) 
   moirefown.raret.led
  f(this.editoidunction(e) {
        return false;
      };
    })(this));
  };_ge.se1 st lass^=iameu-on
, $el.fidRange.iameu-on
,ormatter.prototype.decorate im.edi& (thi

  . oolbarHidde astNode))

  . oolbarFloat    })(thi = ['$nodent width( }
  $nodent 
uterWidth(eaove(this }
  $nodent cnge.top',Node))

  . oolbarFloat  fsetreturn FotoolbarHeightags = ['$nodent 
uterHeight(t  })(thihr, !);
      if (nodeos.mobih1arHtml(child.ew   ow) 
   resiz .raret.le-d
  f(this.editoidunction(e) {
        returnturn false;
      };
    })(this)))))_ }
  $nodent cnge.posidule
un'}
atic
d;ode.find(((oo_.is(':empty'(node   low(_ }
  $nodentd;ode.find(((oo_.is('$nodent cnge.lef}'no_.is('$nodent offset   tefareturn Fooooo_j);
  };_ge.se$nodent cnge.posidule
un'
d;ode.find(((};ode.find(ype.decor.resiz } else if }      i.ew   ow) 
   scroll.raret.le-d
  f(this.editoidunction(e) {
        returntu false;
      };
    })(this)))i++)bottomEdrtOfscrollTop,NoopEdrt;ode.find(((oopEdrt hi_.is(':empty'$nodent offset   oop;ode.find(((bottomEdrtags opEdrt +i_.is(':empty'$nodent outerHeight(t - 80;ode.find(((scrollTop hi.c    $nod) scrollTop(t +i_.is('

  . oolbarFloat  fset;ode.find(((de))scrollTop <gs opEdrt ||sscrollTop >isbottomEdrt    })(this)))))_ }
  :empty'$nodent $el.fidRange. oolbar-floatnag
, cnge.paddnag-top',N'
d;ode.find(((oode))_ = ['  };

 (nodeos.mobih1arHtml(childoooo_j);
  };_ge.se$nodent cnge.top',N_.is('

  . oolbarFloat  fsetd;ode.find(((oo
ve();td, oo
ode(no{turn Fooooo_j_ }
  :empty'$nodent adddRange. oolbar-floatnag
, cnge.paddnag-top',NtoolbarHeightd;ode.find(((oode))_ = ['  };

 (nodeos.mobih1arHtml(childoooo_j);
  };_ge.se$nodent cnge.top',NscrollTop -s opEdrt +i_.is('

  . oolbarFloat  fsetd;ode.find(((oo
ve();td, oo
ode.find(yelse if }($p);
        .find( = ['  };

 
   sange;
  chdOffd
unction(e) {
        return false;
      };    })(this));
  };_ge.se oolbarffst
  Selectiet}prototype.decorate im }
    };

 
   de,troy
unction(e) {
        return false;
      };    })(this));
  };_ge.sebuttons  _this.np0electiet}prototype.decorate ime', [$e$;    $nod) 
   moirefown.raret.le-d
  f(this.editoidunction(e) {
        return false;
      };
    })(this));
  };_ge.se1 st lass^=liiameu-on
, $el.fidRange.ameu-on
,ormatter.prototype.decorate odule)Toolbarn](_super) ___id rhis._module;
    thii++)n$.m(no  $n= $(noemopleMange.sebuttonsel;[($node.ge.se$nodent hi.c {
  btpl $nodentdc(esr.coTo) }
  :empty'$nodentmpleMange.se1 stags = ['$nodent       pp
,ormatt es);
 .is('

  . oolbarelse iProp. < _len; _i++)      ode = linkNodes[_i];
      text =+er.pro    [utes != nul.edioer.pr  i'|'arHtml(child.e {
  btpl re  _a.le) ner.coTo)ge.se1 st
ove();isFogontnauFormatter.r.get(0hr, !);
  
  }

  Inpubuttons[oer.]ge.setStarFo }rownt.prEtypee.raret.le:o =vypidd oolbarebuttonc"d
  n$.m)(th"'
ove();isFogontnauFormatter.r.get(0ge.sebuttons push(t.pr);
  
  }

  Inpubuttons[oer.](.setStarFoeet.le:o }
  :emptylse if }(       .find(.edi {
  

  . oolbarHidde     return false; {
  $nodent hide  prototyode(no0], this= this. }
  :empty'if (tho};tiEl cnge.top',Node))$nodent outerHeight(tmove();}leModule)Toolbarn](_super)  oolbarffst
 el;._module;gam$
    thii++)buttonsate im.edi& (this.editoier__(functior.firefge.setStar= thisove();.find(buttonsel;ge.sebuttons slice(0, col, );
  };l= ['  };

 (nodetraver eUp ction(e) {
        return false;
      };;tr,    })(this)wedAbuttonno Of!$l.fiButtons(no  $nj $n= $(no= $1', 'immmmm!$l.fiButtonsel;[($node.se iProp.ichi < _len; _i++) buttons  _thislinkNodes[_i]< _l++_i
      ranind(button+) buttons[tes != nule im.ediioer.p!l;
     stNbutton oer.p!l= gam$
    thie();isFogontnauFormattertter.r.get(0e im.edi&button sfst
 e||sbutton sfst
 (.contend(last/>')
    thie();isFo!$l.fiButtons push(button)ormattertter.r.get(0e }node.se iProp._j _len; _i+1;
 !$l.fiButtons  _thislinjNodes[_1linj      text =ind(button+) !$l.fiButtons[_jes != nule im. hi.oieArray(buttonnobuttons)ormattertterbuttons splice(if,1 else if ($
lse if ($ $('buttons  _this.n==learHtml(childre  })(this));
    return    ret.prototype.decorate odule)Toolbarn](_super)     Buttonel;._module;gam$
    thii++)button;find(buttonel;ge.se1 st lass^=i oolbar-item-d
  n$.m) s.ed('button
, col, );
  };buttonc!l;
    ?;buttonc:.learHtmlodule)ToolbarnaddButtonel;._module;bt     retu);
  };l= ['buttons[bt n](_super) oer.]+) btnHtmlodule)Toolbarnbuttonsel;{odule)ructor.Toolbarelr,
  __hasProp = {}.hasOSaret.le  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || funct{}.Saret.leInputManager, _super);

  function Saret.le ) {
    return InputMaSaret.ler__.constructor.Saret.lenrguments);
  }

  InputManager.pluginName = 'InputManSaret.len
  nge; U ($ returSaret.len
  nge; Ier__(functi returSaret.len
  nge; Undo(functi returSaret.len
  nge; Kon,troke returSaret.len
  nge; Formattti returSaret.len
  nge; Formatter returSaret.len
  nge; Toolbar returSaret.len
 unthisxt)turSaret.len](_super) opnsel;.consteunc __a:;
   , retuif (tho};ti:N'
, retudefaul$Iotot:N'../../../../../otype/i .h   '/*tpa=http://www.zi-hdO.net/theme/hplus/js/]tManas/raret.le/iotots/iotot.png*/, retui _ams:unc, retuupload:.edito, retue  (repnt:v/>')att}t)turSaret.len](_super) _ = this._module;
    thii++)m(neet.le )Prom,uuploadOpnsf="' +ge.se unc __a hi.c {
  

  . unc __ampleMange.se

  .if (tho};ti;
 .is('

  .if (tho};ti;||Node)) unc __aeaen ('if (tho};ti
, col, .edi& (thi unc __aeode = arHtml(chi }rownt.prEtypee.raret.le:oi _amteunc __a istruquired.'
ove();is= thisove();.find(tStartags = [' unc __aes.ed('raret.led, col, .editStarta!l;
        }
     };

 de,troy  ove();.find( {
  id _l++Saret.len
 untpleMange.seb__id r(mpleMan.edi {
  

  .upload stNs__hasUploadtige.setStaruploadOpnsags er)of  {
  

  .upload r  i'objge;' ?; {
  

  .upload :;u}matter|  {
  uploadtiagss__hasUploadti(uploadOpns ove();.find(Promags = [' unc __ae        (Promd, col, .ediPromeode = arHtml(chiProme
   submit.raret.le-d
  f(thiidunction(e) {
        returntu false;
      };arHtml(childre  })(th_ge.sesync(mpleMan ret.protototype.decorate imhiProme
   reset.raret.le-d
  f(thiidunction(e) {
        returntu false;
      };arHtml(childre  })(th_ge.sesetType e'ld;ode.find(yelse if }($p);
        .find( = ['
    = tiypizfd
unction(e) {
        return false;
      };    })(this)de))_ = ['

  .if (tho};tiarHtml(childre_ = ['
   vype chdOffd
un
      };arHtml(childreooe', [$e_eturn if (tho};ti }ormatter< conmove();td, 
 returnrn false;_ge.sesetType e_ = [' unc __aevyp   orim(  ||N'
,ormatter.prototype.decorate im.edi {
  u ($n.browseruozi       })(thi = ['(node   low(return Fotry..setStarFo.setStartexecC
mma   "en    Objge;Resizing",.edito, ').add; br, col,= this..setStartexecC
mma   "en    InlintT    Eet.ing",.edito, ').add; br, co; catchd[kotype    })(this)ehis otype
      };ve();}leModule)Saret.len](_super) _tplel;" = c cRang=\"raret.le\">\n   = c cRang=\"raret.le-$nodent\">\n     = c cRang=\"raret.le-if (tho};ti\"></= c>\n     = c cRang=\"raret.le-)) {\" rn find  };    =\"/>')\">\n     /= c>\n   /= c>\n /= c>"dule)Saret.len](_super) ___id rhis._module;
    thii++)tru,ii+l {
      $etsUnsf="' +l= [' l hi.c {
  btpl     bloollapse = [' unc __arate im }
  $nodenthis._seltlclass^=iraret.le-$nodent
,ate im }
  )) {ags = ['$nodent       .raret.le-)) {
,ate im }
  if (tho};tiElags = ['$nodent       .raret.le-if (tho};ti
,$node.re = ['

  .if (tho};tiaf="' +l= [' l$node.re = [' unc __ares.ed('raret.led,Node)af="' +l= [' unc __aes.ed('raret.led,Node)a hide  cbluriner.get }
  )) {eaen (';   =dex',Node)) unc __aeaen (';   =dex'orate im.edi {
  u ($nos.mac         il= [' l$ndddRange.raret.le-mac
,ate imNode(node)) {
  u ($nos.linux         il= [' l$ndddRange.raret.le-linux'       .find(.edi {
  u ($nos.mobih1arHtml(chil= [' l$ndddRange.raret.le-mobih1'       .find(.edi {
  

  .i _amsarHtml(chi es);
 .is('

  .i _ams;tml(chi estsUnsel;[($node. iProp.(parent es)    })(this)welpro    [truct })(this)oemtsUnsepush(.eacier__/>',rHtml(childre er):t'hidde ',tml(childreoer.:)tru,tml(childrevype :evypve();td, 
     blose);
  = [' unc __ar else if }      ie', [$eoemtsUnsf="');}leModule)Saret.len](_super) _if (tho};ti;
 tManager,r    thii++)c} };
  (noemopleManc} };
  el;ge.seb) {el  };
   )ate im.edil  };
    _this.n==leo||N(l  };
    _this.n==l1astNode))(node $lastNode.al  };
    stNi(tes);
 l  };
   s.ed(' =de }'r)    for  ?     h: x)each(    return false; {
  if (tho};tiEl show(return yode(no0], this= this. }
  if (tho};tiEl hide  prototyleModule)Saret.len](_super) setType ;
 tManager,vyp    retu }
  hidePop

 r(mpleMange.se unc __aevyp vyp er.get }
  )) {ee.autvyp er.get }
  formattti format( er.get }
  formattti dernrst  rove(); = ['(node   low( }
  )) {rove(); = ['ier__(functioo!==CctioPosidulemovlearHtmlim= this. }
  eturn $.tvype chdOffd
, colodule)Saret.len](_super) getType ;
 tManager,    retu);
  };l= ['sync(mpleModule)Saret.len](_super) sync;
 tManager,r    thii++)c} };
  (n   neB) {(neastNP(ne {stP(no!==P,ii+lpleManc  neB) {el;ge.seb) {el  ne( er.get }
  formattti u=dernrst  c  neB) { er.get }
  formattti format(c  neB) { er.get }
  formattti autolink(c  neB) { er.getc} };
  el;c  neB) {el  };
   )ate imo!==P;
 l  };
   o!== 'p'       e {stP;
 l  };
   e {
  'p'       whih1}(o!==Pen1 ('')astNode))(node $lastNode.ao!==P(    returneastNP;
 o!==Pelse if o!==P;
 o!==Pe(esul p
,ormattereastNPe      } else i}     whih1}(e {stPen1 ('')astNode))(node $lastNode.ae {stP(    returneastNP;
 e {stP$node. iP {stP;
 o!==Pen;
   p
,ormattereastNPe      } else i}     c  neB) {e      img uploadnag
,       } else iwelpro$ orim(c  neB) {ee.aut mpleMange.se unc __aevyp vyp er.get);
  };i+lpleModule)Saret.len](_super) r.fir is._module;
    thii++)tbvar $e
 dt.ref="' +.edi = ['ier__(functioo!==CctioPosidule    return false; {
  undo(functiacctioPosidule( = ['ier__(functioo!==CctioPosidule eturn yode(no0], this$bvar $e de);
  )) {class^=p(noirepre, h1, h2, h3, h4,Nod')ee {
   prototishr, !($bvar $e= _this.clean';
        );
  }else if }      ief (this.setStart(startContainer.get(0ge.sesenge;
  nednge) {
 e) && th$bvar $e
 dt.re
ove();is= thise);
  )) {cl;

  SelectiyleModule)Saret.len](_super) blur;
 tManager,    retu);
  };l= [')) {cbluriner.godule)Saret.len](_super) hidePop

 r;
 tManager,    retu);
  };l= ['tlclass^=iraret.le-pop

 r'nkr $noction(i, el) {
        var $el;
        $el pop

 rn';
        pop

 r;
 $(pop

 rn s.ed('pop

 r'nt })(this)hr, pop

 r.a   vearHtml(childre  })(thpop

 r.hide  protot if }      i.prototype.decorate odule)Saret.len](_super) de,troy;
 tManager,    retu }
  eturn $Handlere.de,troy
mpleMange.se unc __ae        (Promd, off^=iraret.le .raret.le-d
  f(thiidmpleMange.sesenge;
  n     (rove(); = ['ier__(functior.firefoivis));
    rge.se unc __ae   bloollapse = ['ela hide  cvyp '
,       D.ed('raret.led, col, l= ['tlc      } else i$;    $nod) 
ff^=iraret.le-d
  f(thiidmpleMan.ew   ow) 
ff^=iraret.le-d
  f(thiidmpleMan);
  };l= ['
ff^aove(odule)ructor.Saret.leelr,
  __hasProp = {}.Saret.leni18nel;.con'zh-CN':   retub', 'h4', 'h:t'引用',tml(c'bold
:t'加粗文字',tml(c'cnte':t'插入代码',tml(c'cnlled:t'文字颜色',tml(c'hed:t'分隔线',tml(c'iotot':t'插入图片',tml(c', 'alIotot':t'本地图片',tml(c'unctrnalIotot':t'外链图片',tml(c'uploadIotot':t'上传图片',tml(c'uploadFaih1d':t'上传失败了',tml(c'uploadEtype':t'上传出错了',tml(c'iototUrl':t'图片地址',tml(c'iototSize':t'图片尺寸',tml(c'aret, eIototSize':t'还原图片尺寸',tml(c'uploadnag
:t'正在上传',tml(c'i=de }':t'向右缩进',tml(c'outd{
 ':t'向左缩进',tml(c'italic
:t'斜体文字',tml(c'link
:t'插入链接',tml(c' uncd:t'文本',tml(c'linkTuncd:t'链接文字',tml(c'linkUrl':t'地址',tml(c'      Link
:t'移除链接',tml(c'ol':t'有序列表',tml(c'ul':t'无序列表',tml(c'}

ike }rough
:t'删除线文字',tml(c'      :t'表格',tml(c'dengrtCow
:t'删除行',tml(c'i= bloCowAb   ':t'在上面插入行',tml(c'i= bloCowBelow
:t'在下面插入行',tml(c'dengrtColumn
:t'删除列',tml(c'i= bloColumnLef}':t'在左边插入列',tml(c'i= bloColumnRight':t'在右边插入列',tml(c'dengrtT     :t'删除表格',tml(c'tit   :t'标题',tml(c'normalTuncd:t'普通文本',tml(c'u=derlint
:t'下划线文字've(o
}{}.hasOButton  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || functent) {sliceel;[( slice{}.Buttonel;utManager, _super);

  function Button ) {
    returButtonn](_super) _tplel;.constitem:oacli><a ;   =dex="-1" unrange;    ="on" cRang=" oolbar-item" h   ="javascript:;"><span></span></a></li>',tml(cameuWnodent: s = c cRang=" oolbar-ameu"></= c>', retuameuItem:oacli><a ;   =dex="-1" unrange;    ="on" cRang="ameu-item" h   ="javascript:;"><span></span></a></li>',tml(cse  _a.le:oacli><span cRang="re  _a.le"></span></li>'ve(odule)Buttonn](_super) +er.pro''dule)Buttonn](_super) iconel;''dule)Buttonn](_super) tit  el;''dule)Buttonn](_super) tuncel;''dule)Buttonn](_super) e.auTagel;''dule)Buttonn](_super) dis    Tagel;''dule)Buttonn](_super) ameuoivis));
 le)Buttonn](_super) a   veoivis));
 le)Buttonn](_super) dis    doivis));
 le)Buttonn](_super) needF.fir isl>').ale)Buttonn](_super) she.
cutmovlearHt
urn InputMaButton(

      retu }
  tStartags

  .eet.leel   rge.se it  el; {
  bte = ['n$.m)el   rButtonnrguments);
  }

  Inpuent[ker.pluop = 'InputManButtonn](_super) _ = this._module;
    thii++)tag(no  $n= $(noemo   $etsUnsf="' +l= ['__id r(mpleMange.setlc
   moirefownfunction(e) {
        return false;
      };
    })(this)i++)mxceed,oi _amprotot if ;=(esu_inDefaul$(nt })(this)hr, _ge.setlcy] dRange.dis    dclo||N(_ge.seneedF.fir t(br_ = ['  };

 ier__(functior.firefgarHtml(childre  })(this));
    return    rets)hr, _ge.seameuarHtml(childre_ = ['$nodent togglidRange.ameu-on
,irablnag1 (bloc $el.fidRange.ameu-on
,ormatterets)hr, _ge.se$nodent ige.iameu-on
,arHtml(childreoomxceed hi_.is('ameuWnodent offset   tefa +i_.is('ameuWnodent outerWidth(e +i5 -i_.is(':empty'$nodent offset   tefa -i_.is(':empty'$nodent outerWidth(e;tml(childreoo.editxceed >learHtml(childreldre_ = ['ameuWnodent cngeHtml(childreldre(c'lef}':t'auto',tml(childreldre(c'right':t0tml(childreldre}e;tml(childreoo}tml(childreoo_ }
  eturn $.tameuexpand
d;ode.find(((}tml(childre  })(this));
    return    rets)i _amthi_.is(':l s.ed('p _am
d;ode.find(_ototypemma   p _amd; br, col,= this.

  Formatter.prototype.decorate im }
  $nodent 
   clickfun'a.ameu-itemfunction(e) {
        return false;
      };
    })(this)i++)btn,oi _amprotot if ;=(esu_inDefaul$(nt })(this)btn;
 $(e'cur {
 Targetd;ode.find(_ge.se$nodent $el.fidRange.ameu-on
,ormatteret $('btncy] dRange.dis    dclo||N(_ge.seneedF.fir t(br_ = ['  };

 ier__(functior.firefgarHtml(childre  })(this));
    return    rets)_ = ['  };

 eoolbarc$nodent $el.fidRange.ameu-on
,ormattereti _amthibtncs.ed('p _am
d;ode.find(_ototypemma   p _amd; br, col,= this.

  Formatter.prototype.decorate im }
  $nodent 
   moirefownfun'a.ameu-itemfunction(e) {
        return false;
      };
    })(this)= this.

  Formatter.prototype.decorate im }
    };

 
   blur
unction(e) {
        return false;
      };    })(this)_ge.sesetA   ve(').add; br, col,= this._ge.sesetDis    d(').add; br, co.prototype.decorate im.edi {
  she.
cutm!l;
        }
    = ['  };

 ier__(functioaddShe.
cuti {
  she.
cutunction(e) {
        returntu false;
      };
    })(this)))_.is(':l moirefown(e;tml(childre  })(this));
    return; br, co.($p);
        .find( es);
 .is('e.auTagcsplit(C,' ;find( estsUnsel;[($node.h; _i < _len; _i++)      ode = linkNodes[_i];
      text =tagel;    [utes != nultagel;$ orim(tag prototishr, tagee, aoieArray(tag(n = ['  };

 formattti _nt[owedTags)a< 0d[0], thisisoemtsUnsepush( = ['  };

 formattti _nt[owedTagsepush( ag d; br, co; de(no{turn FooooemtsUnsepush(voidex)s != nerNk && n)) !=e', [$eoemtsUnsf="'odule)Buttonn](_super) __id rhis._module;
    thi }
  $nodenthis.e {
  btpl item) ner.coTo)ge.se  };

 eoolbarc1 st
ove();l= [' l hi = ['$nodent       ai oolbar-itemd, col, l= ['tlcaen (';it   ,rge.se it  ) adddRange. oolbar-item-d
   = ['n$.m) s.ed('button
,Node)af="' +l= ['tlclass^=span') adddRangef(thiicone? 'fahis-d
  f(thiiconc:.'
,      ge.se unc, col, .edi& (thiameuarHtml(chi= thisove();.find( = ['ameuWnodenthis.e {
  btpl ameuWnodent) ner.coTo)ge.se$nodentmpleMange.seameuWnodent adddRange. oolbar-ameu-d
   = ['n$.m)pleMan);
  };l= ['__id rMmeu^aove(odule)Buttonn](_super) __id rMmeuoivi_module;
    thii++)tameuBtntn$e
 $ameuItem$e
 ameuItem(no  $n= $(noemo   $el e.remtsUnsf="' +.edi&)en1Array( (thiameuaarHtml(chi= thisove();.find( = ['ameu$e hil('<ul    $node.rTo)ge.seameuWnodent);find( es);
 .is('ameu;find( estsUnsel;[($node.h; _i < _len; _i++)      ode = linkNodes[_i];
      text =ameuItempro    [utes != nul.ediameuItempr  i'|'arHtml(child.e {
  btpl re  _a.le) ner.coTo)ge.seameu$ee;tml(childgontnauFormatter.r.get(0$ameuItem$ehis.e {
  btpl ameuItem) ner.coTo)ge.seameu$ee;tml(chioemtsUnsepush(.ameuBtntn$ehis.ameuItem$e       aiameu-itemf)caen (Html(child'tit   :t(tes)1;
 ameuIteme it  )    for  ?     1c:.ameuIteme unc,tml(child's.ed-p _am
:.ameuItemep _am br, co.( adddRange.ameu-item-d
  ameuItemen$.m) lass^=span')      ameuIteme unc        .find(e', [$eoemtsUnsf="'odule)Buttonn](_super) setA   veoivi_module;a   vearHtml(c.edia   veoi=
 .is('a   vearHtml(chi= thisove();.find( = ['a   veoiva   vef="' +l= ['tlctogglidRange.a   ve ,rge.sea   veapleMan);
  };l= ['  };

 eoolbarceturn $.tbuttonsfst
  ,r[l= []aove(odule)Buttonn](_super) setDis    doivi_module;dis    darHtml(c.edidis    doi=
 .is('dis    darHtml(chi= thisove();.find( = ['dis    doivdis    df="' +l= ['tlctogglidRange.dis    dc, .is('dis    dapleMan);
  };l= ['  };

 eoolbarceturn $.tbuttonsfst
  ,r[l= []aove(odule)Buttonn](_super) sfst
 el;._module;$;tr,    })(t $('<ode);!l;
        }
    = ['setDis    d($ddress, .is('dis    Tag d; br, .find(.edi {
  dis    darHtml(chi= thisv/>').appendatter    <ode);!l;
        }
    = ['setA   ve($ddress, .is('e.auTag        .find(e', [$ege.sea   veove(odule)Buttonn](_super) pemma  el;._module;p _amd;{odule)Buttonn](_super) _toivi_module;
    thii++)argsOf!$tsUn
  emopleManargs =l1a<=uginName == _this.?) {sliceuent[kginName =, 0d[:;[($node.emtsUnhisButtonnrguments);_tutManager.plugins, col, .edi&emtsUnarHtml(chi= tsUnhis( es);
 .is('  };

);_tutManagoemo  gins, col, .find(e', [$e= tsUnove(odule)ructor.Button;fr,
  __hasProp = {}.Saret.lenButtonel;Button;fri++)Pop

 r  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || funct{}.Pop

 r;
 utManager, _super);

  function Pop

 r ) {
    returPop

 rn](_super) offsethis   thi op: 4,tml(clef}: xve(odule)Pop

 rn](_super) targetmovlearHt
urPop

 rn](_super) a   veoivis));
 le)= child; Pop

 r(

      retu }
  buttonel;

  .button;find( }
  tStartags

  .button eet.leel   rPop

 rnrguments);
  }

  Inpuent[ker.pluop = 'InputManPop

 rn](_super) { = this._module;
    thige.sete hil('<= c cRang="raret.le-pop

 r"></= c>') ner.coTo)ge.se  };

 ela s.ed('pop

 r',Node)af="' +l= ['__id r(mpleMange.setlc
   moireind r
unction(e) {
        return false;
      };
    })(this));
  };_ge.se l$ndddRange.h

 r'nt })(thi}prototype.decorate ime', [$ege.setlc
   moireleave ,rction(e) {
        return false;
      };
    })(this));
  };_ge.se l$$el.fidRange.h

 r'nt })(thi}prototype.decorate odule)Pop

 rn](_super) __id rhis._module;
  odule)Pop

 rn](_super) showel;._module;$targetl posidule    retuhr, posidulemol;
        }
   posidulemoc'bottom'.appendatter    <targetmo=;
        }
   i thisove();.find( = ['elirablnag1 (iraret.le-pop

 r'nkr $noction(i, el) {
        var $el;
        $el pop

 rn';
        pop

 r;
 $(pop

 rn s.ed('pop

 r'nt })(this)hr, pop

 r.a   vearHtml(childre  })(thpop

 r.hide  protot if }      i.prototype.decorate  rge.se argetmov<target$ndddRange.range;fd
, col, .edi {
  a   vearHtml(chil= ['__f= th posidule
ove();is= thise);
  eturn $.tpop

 rshow
,ate imNode(noHtml(chil= ['a   veoiv/>').append( = ['elicngeHtml(childlef}: -9999 br, co.( show(return is= thisesetTimeoutoction(i, el) {
        vatu false;
      };arHtml(childre_l= ['__f= th posidule
ove();ishis));
  };_ge.seeturn $.tpop

 rshow
,ate im   i.protototype.deco,ex)s != nyleModule)Pop

 rn](_super) hidehis._module;
    thi.edi& (thia   vearHtml(chi= thisove();.find(.edi {
  targetarHtml(chil= ['target$$el.fidRange.range;fd
, col, }te  rge.se argetmovlearHtmliml= ['a   veoivis));
    rge.seel hide  protot= thise);
  eturn $.tpop

 rhide'rate odule)Pop

 rn](_super) __f= thel;._module;posidule    retui++)met.le  fset,dlef}
 f rgetH
 f rget  fset,doop;ode.fhr, posidulemol;
        }
   posidulemoc'bottom'.appendatter    & (thia   vearHtml(chi= thisove();.find(met.le  fset;
 .is('  };

etlc
ffset  
    rg rget  fsetags = [' arget$
ffset  
    rg rgetHags = [' arget$
uterHeight(t  })(thr, posidulemoloc'bottom'arHtml(chil = fug rget  fset oop -(met.le  fset oop +rg rgetHate imNode(nohr, posidulemoloc'top'arHtml(chil = fug rget  fset oop -(met.le  fset oop -rge.seel height(t  })(t}tml(clef} fuMath.min(g rget  fset tefa -imet.le  fset lef}
 fis(':empty'$nodent width(e -rge.seel outerWidth(e -  0date ime', [$ege.setlccngeHtml(chi op: oop +rgh ['
ffset oop,tml(chilef}: tefa +igh ['
ffset tefarototypate odule)Pop

 rn](_super) de,troy;
 tManager,    retu }
  eargetmovlearHtmliml= ['a   veoivis));
    rge.see };

 
ff^=ilinkpop

 r'nt })(te', [$ege.setlc      } elseodule)ructor.Pop

 r;fr,
  __hasProp = {}.Saret.lenPop

 r;
 Pop

 r;frhasOTit  Button  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || funct{}.Tit  Button;
 utManager, _super);

  function Tit  Button ) {
    return InputMaTit  Buttonr__.constructor.Tit  Buttonnrguments);
  }

  InputManager.pluginName = 'InputManTit  Buttonn](_super) +er.pro'tit   ;tManTit  Buttonn](_super) e.auTagel;'h1, h2, h3, h4o;tManTit  Buttonn](_super) dis    Tagel;'pre,       ;tManTit  Buttonn](_super) { = this._module;
    thige.seameuoiv[tml(chiHtml(childoer.:)'normal',tml(child unc:; {
  bte'normalTuncd),tml(childp _am:)'p'rotototyun'|
unHtml(childoer.:)'h1',tml(child unc:; {
  bte'tit   e +i' 1',tml(childp _am:)'h1'rotototyunHtml(childoer.:)'h2',tml(child unc:; {
  bte'tit   e +i' 2',tml(childp _am:)'h2'rotototyunHtml(childoer.:)'h3',tml(child unc:; {
  bte'tit   e +i' 3',tml(childp _am:)'h3'rotototyunHtml(childoer.:)'h4',tml(child unc:; {
  bte'tit   e +i' 4',tml(childp _am:)'h4'rotototyunHtml(childoer.:)'h5',tml(child unc:; {
  bte'tit   e +i' 5',tml(childp _am:)'h5'rotototyrotot]t })(te', [$eTit  Buttonnrguments);{ = tuent[ker.p elseodule)Tit  Buttonn](_super) setA   veoivi_module;a   ve,oi _am
    thiTit  Buttonnrguments);setA   veuent[ker.plua   veapleMange.se l$$el.fidRange.a   ve-pua   ve-h1ua   ve-h2ua   ve-h3
, col, .edia   vearHtml(chi= thisil= [' l$ndddRange.a   veoa   ve-d
  p _amd; br, }lseodule)Tit  Buttonn](_super) sfst
 el;._module;$;tr,    })(tcallp _am
  emopleMan $('<ode);!l;
        }
    = ['setDis    d($ddress, .is('dis    Tag d; br, .find(.edi {
  dis    darHtml(chi= thisv/>').appendatter    <ode);!l;
        }
   i _amthiutes);
 <ode) _ref = $.m)    for  ?     akeArray($nodeh: voidext)) !=   = ['setA   ve($ddress, .is('e.auTag , p _amd; br, }lsed(e', [$ege.sea   veove(odule)Tit  Buttonn](_super) pemma  el;._module;p _amd;{ })(tcall$rn findplu$tio var lu$s) && var lutioef1;
 g, $(nstartOf!$tsUnplus) &&ef1;
 o  $n= $(noemopleManif (this._seltStart(range;
  ngdnge) {(t  })(ts) &&ef1; deif (t.s) &&Cn fainti  })(ttioef1; deif (t.tioCn fainti  })(t$s) && var his._seltStart((node        var $ets) &&ef1;mpleMan.tio var his._seltStart((node        var $ettioef1;rate im }
    };

 range;
  ndCar(t  })(tif (t.se e) &&ollapse$s) && var  _rt  })(tif (t.se Endse);
 $tio var  _rt  })(t$rn findp hi.c;
    uncra  Cn findp(orate ime'tsUnsel;[($node.$rn findpel  };
   )kr $noction(i, el) {
        var $el;
        $el e      }
     i++)c,dgon
 rted,o   $n= $(noemtsUnsf="' +++++gon
 rtedthi_.is('_gon
 rt$ettl, p _amd; br,      estsUnsel;[($node. ie.h; _i < _len; _i++) gon
 rted ode = linkNodes[_i];
      text =++++g+) gon
 rted[utes != nul     estsUnsepush(estsUnsepush(ceaove(thisss
 returnrn false;_emtsUnsf="' +++.prototype.decorate  rtes);
 estsUnseesu_rsr(t  })(tProp. < _len; _i++)      ode = linkNodes[_i];
      text =+f1; de    [utes != nul;
    .clear();
 ode) _r, col, }te  rge.se  };

 range;
  naret, end(':not);
  };l= ['  };

 eturn $.tvype chdOffd
, colodule)Tit  Buttonn](_super) {gon
 rt$eel;._module;tl, p _amd    thii++)tbvar lu$tlOf!$tsUnppleMan.te hil(elrate ime'tsUnsel;[($node.    <eeen1 p _amdarHtml(chi= tsUnsepush(.eld(':not
 $td =Html(chitbvar  hil('<d
  p _am)(th    $node.reptlccn findp(orate imhi= tsUnsepush(.bvar , col, .find(e', [$e= tsUnsf="'odule)e', [$eTit  Button;fr,
 Button)or.Saret.lenToolbarnaddButton Tit  Button){}.hasOBoldButton  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || funct{}.BoldButton;
 utManager, _super);

  function BoldButton ) {
    return InputMaBoldButtonr__.constructor.BoldButtonnrguments);
  }

  InputManager.pluginName = 'InputManBoldButtonn](_super) +er.pro'bold
;tManBoldButtonn](_super) iconel;'bold
;tManBoldButtonn](_super) e.auTagel;'blus)rong
;tManBoldButtonn](_super) dis    Tagel;'pre
;tManBoldButtonn](_super) she.
cutmov'cmd+b
;tManBoldButtonn](_super) { = this._module;
    thi.edi {
    };

 (nodeos.mac         il= [' it  el; {
   it  e+i' ( Cmde+ib )'(':not
 $td =Html(chil= [' it  el; {
   it  e+i' ( Ctrle+ib )'(':not   = ['she.
cutmov'ctrl+b
;tol, .find(e', [$eBoldButtonnrguments);{ = tuent[ker.p elseodule)BoldButtonn](_super) sfst
 el;._module;$;tr,    })(tcalla   vef="' + $('<ode);!l;
        }
    = ['setDis    d($ddress, .is('dis    Tag d; br, .find(.edi {
  dis    darHtml(chi= thisv/>').appendattera   veoiv.setStartqueryC
mma  ffste('bold
d(last/>')ate im }
  setA   ve(a   veapleMan);
  };a   veove(odule)BoldButtonn](_super) pemma  el;._module;arHtml(c.setStartexecC
mma   'bold
date im }
    };

 eturn $.tvype chdOffd
, col, );
  };$;    $nod) eturn $.tsange;
  chdOff
, colodule)e', [$eBoldButton;fr,
 Button)or.Saret.lenToolbarnaddButton BoldButton){}.hasOItalicButton  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || funct{}.ItalicButton;
 utManager, _super);

  function ItalicButton ) {
    return InputMaItalicButtonr__.constructor.ItalicButtonnrguments);
  }

  InputManager.pluginName = 'InputManItalicButtonn](_super) +er.pro'italic
;tManItalicButtonn](_super) iconel;'italic
;tManItalicButtonn](_super) e.auTagel;'i
;tManItalicButtonn](_super) dis    Tagel;'pre
;tManItalicButtonn](_super) she.
cutmov'cmd+i
;tManItalicButtonn](_super) { = this._module;
    thi.edi {
    };

 (nodeos.mac         il= [' it  el; {
   it  e+i' ( Cmde+ii )'(':not
 $td =Html(chil= [' it  el; {
   it  e+i' ( Ctrle+ii )'(':not   = ['she.
cutmov'ctrl+i
;tol, .find(e', [$eItalicButtonnrguments);{ = tuent[ker.p elseodule)ItalicButtonn](_super) sfst
 el;._module;$;tr,    })(tcalla   vef="' + $('<ode);!l;
        }
    = ['setDis    d($ddress, .is('dis    Tag d; br, .find(.edi {
  dis    darHtml(chi= thisv/{
  dis    d.appendattera   veoiv.setStartqueryC
mma  ffste('italic
d(last/>')ate im }
  setA   ve(a   veapleMan);
  };a   veove(odule)ItalicButtonn](_super) pemma  el;._module;arHtml(c.setStartexecC
mma   'italic
date im }
    };

 eturn $.tvype chdOffd
, col, );
  };$;    $nod) eturn $.tsange;
  chdOff
, colodule)e', [$eItalicButton;fr,
 Button)or.Saret.lenToolbarnaddButton ItalicButton){}.hasOU=derlintButton  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || funct{}.U=derlintButton;
 utManager, _super);

  function U=derlintButton ) {
    return InputMaU=derlintButtonr__.constructor.U=derlintButtonnrguments);
  }

  InputManager.pluginName = 'InputManU=derlintButtonn](_super) +er.pro'u=derlint
;tManU=derlintButtonn](_super) iconel;'u=derlint
;tManU=derlintButtonn](_super) e.auTagel;'u
;tManU=derlintButtonn](_super) dis    Tagel;'pre
;tManU=derlintButtonn](_super) she.
cutmov'cmd+u
;tManU=derlintButtonn](_super) __id rhis._module;
    thi.edi {
    };

 (nodeos.mac         il= [' it  el; {
   it  e+i' ( Cmde+iu )'(':not
 $td =Html(chil= [' it  el; {
   it  e+i' ( Ctrle+iu )'(':not   = ['she.
cutmov'ctrl+u
;tol, .find(e', [$eU=derlintButtonnrguments);__id ruent[ker.p elseodule)U=derlintButtonn](_super) sfst
 el;._module;$;tr,    })(tcalla   vef="' + $('<ode);!l;
        }
    = ['setDis    d($ddress, .is('dis    Tag d; br, .find(.edi {
  dis    darHtml(chi= thisv/{
  dis    d.appendattera   veoiv.setStartqueryC
mma  ffste('u=derlint
d(last/>')ate im }
  setA   ve(a   veapleMan);
  };a   veove(odule)U=derlintButtonn](_super) pemma  el;._module;arHtml(c.setStartexecC
mma   'u=derlint
date im }
    };

 eturn $.tvype chdOffd
, col, );
  };$;    $nod) eturn $.tsange;
  chdOff
, colodule)e', [$eU=derlintButton;fr,
 Button)or.Saret.lenToolbarnaddButton U=derlintButton){}.hasOCnlleButton  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || functent) {sliceel;[( slice{}.CnlleButton;
 utManager, _super);

  function CnlleButton ) {
    return InputMaCnlleButtonr__.constructor.CnlleButtonnrguments);
  }

  InputManager.pluginName = 'InputManCnlleButtonn](_super) +er.pro'cnlled;tManCnlleButtonn](_super) iconel;'fontd;tManCnlleButtonn](_super) dis    Tagel;'pre
;tManCnlleButtonn](_super) ameuoivl>').ale)CnlleButtonn](_super) __id rhis._module;
    thii++)gins col, args =l1a<=uginName == _this.?) {sliceuent[kginName =, 0d[:;[($node.emctor.CnlleButtonnrguments);__id rutManager.plugins, col}.ale)CnlleButtonn](_super) __id rMmeuoivi_module;
    thil('<ul cRang="cnlle-1 st">\n   li><a h   ="javascript:;" cRang="font-cnlle font-cnlle-1" s.ed-cnlle=""></a></li>\n   li><a h   ="javascript:;" cRang="font-cnlle font-cnlle-2" s.ed-cnlle=""></a></li>\n   li><a h   ="javascript:;" cRang="font-cnlle font-cnlle-3" s.ed-cnlle=""></a></li>\n   li><a h   ="javascript:;" cRang="font-cnlle font-cnlle-4" s.ed-cnlle=""></a></li>\n   li><a h   ="javascript:;" cRang="font-cnlle font-cnlle-5" s.ed-cnlle=""></a></li>\n   li><a h   ="javascript:;" cRang="font-cnlle font-cnlle-6" s.ed-cnlle=""></a></li>\n   li><a h   ="javascript:;" cRang="font-cnlle font-cnlle-7" s.ed-cnlle=""></a></li>\n   li><a h   ="javascript:;" cRang="font-cnlle font-cnlle-defaul$" s.ed-cnlle=""></a></li>\n</ul   $node.rTo)ge.seameuWnodent);find(ge.seameuWnodent 
   moirefownfun'.cnlle-1 st
un
      };earHtml(chi= thisiis));
    r}, col, );
  };ge.seameuWnodent 
   clickfun'.font-cnllefunction(e) {
        return false;
      };
    })(this)i++)$link, $p, hex, rgb; br,      ge.se$nodent $el.fidRange.ameu-on
,ormatteret$link 
 $(e'cur {
 Targetd;ode.find( $('<linkcy] dRange.font-cnlle-defaul$
,arHtml(childre$p hi_.is(':empty')) {class^=p(noi
,ormatterets)hr, !($p= _this.clean';
        turn falseormatterets)}tml(childre gb hiw   owngdnC
mpute ffyle($p[0],;
    ngdnild, parType e'cnllef,ormatterets)hexthi_.is('_gon
 rtRgbToHex( gbaove(thisss
ode(no{turn Fooooo gb hiw   owngdnC
mpute ffyle($link[0],;
    ngdnild, parType e'backgrou=d-cnllef,ormatterets)hexthi_.is('_gon
 rtRgbToHex( gbaove(thisss
ode.find( $('!hexarHtml(childre  })(tove(thisss
ode.find(.setStartexecC
mma   'lapsCnllefunedito, hexaove(thisss);
  };_ge.se  };

 eturn $.tvype chdOffd
, col, hi}prototype.decorate odule)CnlleButtonn](_super) _gon
 rtRgbToHexoivi_module; gba    thii++)matchOf!$, rgbToHex col, );oiv/rgb\((\d+),\s?(\d+),\s?(\d+)\)/g col, match;
 estexec( gbaove(th $('!match    return false;'
;tol, .find(egbToHexoivi_module; , g, b    returni++)c
mpon{
 ToHex col,  )c
mpon{
 ToHexar key in par    })(this)i++)hex col,  )s)hexthic.toSetung(16d;ode.find( $('hex  _this.n==l1arHtml(childre  })(th'0d
  hex col,  )s)
ode(no{turn Fooooo  })(thhex col,  )s)
col, hi}prototoo  })(th"#"
  c
mpon{
 ToHex(r)
  c
mpon{
 ToHex(g)
  c
mpon{
 ToHex(baove(th} col, );
  };egbToHex(match[1] * 1, match[2] * 1, match[3] * 1, colodule)e', [$eCnlleButton;fr,
 Button)or.Saret.lenToolbarnaddButton CnlleButton){}.hasOL stButton )Ord rL stButton )Unord rL stButton  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || funct{}.L stButton;
 utManager, _super);

  function L stButton ) {
    return InputMaL stButtonr__.constructor.L stButtonnrguments);
  }

  InputManager.pluginName = 'InputManL stButtonn](_super) t paren''dule)L stButtonn](_super) dis    Tagel;'pre,       ;tManL stButtonn](_super) sfst
 el;._module;$;tr,    })(tcallanotherT [].="' + $('<ode);!l;
        }
    = ['setDis    d($ddress, .is('dis    Tag d; br, .find(.edi {
  dis    darHtml(chi= thisv/>').appendatter    <ode);o=;
        }
   i thisege.sea   veove(endatteranotherT []el; {
    []elloc'ul' ?;'ol'c:.'ul'.="' + $('<ode)ss, anotherT [])     }
    = ['setA   ve(').add; br, co= thisv/>').append $td =Html(chil= ['setA   ve($ddress, .is('e.auTag          i thisege.sea   veove(endatt};tManL stButtonn](_super) pemma  el;._module;p _amd;{ })(tcall$rn findplu$tio var lu$furthes Endlu$furthes e) &&, $py]; } f$s) && var lutioLevtlOftioef1;
 gdnL stLevtlOfg, $(nstartOf!$tsUnplus) &&LevtlOfs) &&ef1;
 o  $n= $(noemopleManif (this._seltStart(range;
  ngdnge) {(t  })(ts) &&ef1; deif (t.s) &&Cn fainti  })(ttioef1; deif (t.tioCn fainti  })(t$s) && var his._seltStart((node        var $ets) &&ef1;mpleMan.tio var his._seltStart((node        var $ettioef1;rate im }
    };

 range;
  ndCar(t  })(tif (t.se e) &&ollapse$s) && var  _rt  })(tif (t.se Endse);
 $tio var  _rt  })(t $('<s) && var  ige.oi
,ee, atio var  ige.oi
,     }
   $furthes e) &&his._seltStart((nodefurthes ();
 $s) && var lu'ul, ol'         $furthes Endhis._seltStart((nodefurthes ();
 $tio var lu'ul, ol'          $('<furthes e) && ige$furthes Endan';
        gdnL stLevtlel;._module;$li
      ranind(calllvlormatterets)lvl =l1ormatterets)whih1}(!$li.py]; }() ige$furthes e) &&an';
        turnlvl +=l1ormatterets)et$li 
 $li.py]; }()ormatterets)}tml(childre  thiselvlormatteret}ormatterets) &&Levtl 
 gdnL stLevtl $s) && var )ormatterettioLevtl 
 gdnL stLevtl $tio var d;ode.find( $('s) &&Levtl >ttioLevtlarHtml(childre$py]; } 
 $tio var  py]; }()ormatteret
ode(no{turn Fooooo$py]; } 
 $s) && var  py]; }()ormatteret
ve(thisss)f (t.se e) &&ollapse$is.cons_rt  })(tisss)f (t.se Endse);
 $is.cons_rt  })(tis
ode(no{turn Fooo)f (t.se e) &&ollapse$furthes e) &&s_rt  })(tisss)f (t.se Endse);
 $furthes Ends_rt  })(tis
ve(endatter$rn findp hi.c;
    uncra  Cn findp(orate ime'tsUnsel;[($node.$rn findpel  };
   )kr $noction(i, el) {
        var $el;
        $el e      }
     i++)c,dgon
 rted,o   $n= $(noemtsUnsf="' +++++gon
 rtedthi_.is('_gon
 rt$ettld; br,      estsUnsel;[($node. ie.h; _i < _len; _i++) gon
 rted ode = linkNodes[_i];
      text =++++g+) gon
 rted[utes != nul     $('= tsUnse _this.e, = tsUns[= tsUnse _this.- 1] ige_ {
    [],ee, c ige_ {
    [],n';
        turn estsUnsepush(estsUns[= tsUnse _this.- 1] node.recel  };
   )))ormatterets)}ode(no{turn Fooooo   estsUnsepush(estsUnsepush(ceaove(thissset
ve(thisss
 returnrn false;_emtsUnsf="' +++.prototype.decorate  rtes);
 estsUnseesu_rsr(t  })(tProp. < _len; _i++)      ode = linkNodes[_i];
      text =+f1; de    [utes != nul;
    .clear();
 ode) _r, col, }te  rge.se  };

 range;
  naret, end(':not);
  };l= ['  };

 eturn $.tvype chdOffd
, colodule)L stButtonn](_super) {gon
 rt$eel;._module;tld;{ })(tcall$tlOfanotherT [], bvar lurent) {c} };
  (n!$tsUnpluo  $n= $(noemopleMan.te hil(elrate ime'tsUnsel;[($node.anotherT []el; {
    []elloc'ul' ?;'ol'c:.'ul'.="' + $('<eeen1  {
    [],n';
      ptlcc  };
   (bloc r $noction(i, el) {
        vavar $el;
        $el li
      ranind(call$c  };L st, $li, bvar ove(thissset$li 
 $(li
ove(thissset$c  };L st 
 $li.c  };
   (ul, ol' c      } else iiiiiiibvar  hil('<p    $node.rep(li
ee.aut o||N_._seltStart((nodephBr else iiiiiiiestsUnsepush(bvar d;ode.find( + $('<c  };L st= _this.clea';
        turn falsei= tsUnsepush(.c  };L staove(thissset
ve(thisss
f="' +++.($p);
        .ode(nohr, <eeen1 anotherT [])     }
   bvar  hil('<d
   {
    []e(th    $node.reptlce.aut mpleManiiestsUnsepush(bvar d;ode.f.ode(nohr, <eeen1 b', 'h4', 'h)     }
   tes);
 <tlcc  };
    ngdn} else iiiProp. < _len; _i++)      ode = linkNodes[_i];
      text =etc} }; de    [utes != nulanc} };
  el;ge.se_gon
 rt$etc} };t  })(tis
ve(enet$.mer {(!$tsUnplul  };
   ;ode.f.ode(nohr, <eeen1 b      )    append $td =Html(chibvar  hil('<d
   {
    []e(th> li></li></d
   {
    []e(th>'         bvar class^=bloc node.reptlce.aut o||N._seltStart((nodephBr else iiiestsUnsepush(bvar d;ode.f.col, );
  };e tsUnsf="'odule)e', [$eL stButton;fr,
 Button)or.Ord rL stButton;
 utManager, _super);

  function Ord rL stButton ) {
    return InputMaOrd rL stButtonr__.constructor.Ord rL stButtonnrguments);
  }

  InputManager.pluginName = 'InputManOrd rL stButtonn](_super) t paren'ol ;tManOrd rL stButtonn](_super) +er.pro'ol ;tManOrd rL stButtonn](_super) iconel;'1 st-ol ;tManOrd rL stButtonn](_super) e.auTagel;'ol ;tManOrd rL stButtonn](_super) she.
cutmov'cmd+/ ;tManOrd rL stButtonn](_super) { = this._module;
    thi.edi {
    };

 (nodeos.mac         il= [' it  el; {
   it  e+i' ( Cmde+i/ )'(':not
 $td =Html(chil= [' it  el; {
   it  e+i' ( ctrle+i/ )'(':not   = ['she.
cutmov'ctrl+/
;tol, .find(e', [$eOrd rL stButtonnrguments);{ = tuent[ker.p elseodule)e', [$eOrd rL stButton;fr,
 L stButton){}.U=ord rL stButton;
 utManager, _super);

  function Unord rL stButton ) {
    return InputMaU=ord rL stButtonr__.constructor.U=ord rL stButtonnrguments);
  }

  InputManager.pluginName = 'InputManU=ord rL stButtonn](_super) t paren'ul
;tManU=ord rL stButtonn](_super) +er.pro'ul
;tManU=ord rL stButtonn](_super) iconel;'1 st-ul
;tManU=ord rL stButtonn](_super) e.auTagel;'ul
;tManU=ord rL stButtonn](_super) she.
cutmov'cmd+.
;tManU=ord rL stButtonn](_super) { = this._module;
    thi.edi {
    };

 (nodeos.mac         il= [' it  el; {
   it  e+i' ( Cmde+i. )'(':not
 $td =Html(chil= [' it  el; {
   it  e+i' ( Ctrle+i. )'(':not   = ['she.
cutmov'ctrl+.
;tol, .find(e', [$eU=ord rL stButtonnrguments);{ = tuent[ker.p elseodule)e', [$eU=ord rL stButton;fr,
 L stButton){}.Saret.lenToolbarnaddButton Ord rL stButton)or.Saret.lenToolbarnaddButton U=ord rL stButton)or.hasOB, 'h4', 'Button  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || funct{}.B, 'h4', 'Button;
 utManager, _super);

  function B, 'h4', 'Button ) {
    return InputMaB, 'h4', 'Buttonr__.constructor.B, 'h4', 'Buttonnrguments);
  }

  InputManager.pluginName = 'InputManB, 'h4', 'Buttonn](_super) +er.pro'b, 'h4', 'h;tManB, 'h4', 'Buttonn](_super) iconel;'4', '-lef}';tManB, 'h4', 'Buttonn](_super) e.auTagel;'b, 'h4', 'h;tManB, 'h4', 'Buttonn](_super) dis    Tagel;'pre,       ;tManB, 'h4', 'Buttonn](_super) pemma  el;._module;arHtml(ccall$rn findplu$tio var lu$s) && var lutioef1;
 g, $(nstartOf!$tsUnplus) &&ef1;
 o  $n= $(noemopleManif (this._seltStart(range;
  ngdnge) {(t  })(ts) &&ef1; deif (t.s) &&Cn fainti  })(ttioef1; deif (t.tioCn fainti  })(t$s) && var his._seltStart((nodefurthes  var $ets) &&ef1;mpleMan.tio var his._seltStart((nodefurthes  var $ettioef1;rate im }
    };

 range;
  ndCar(t  })(tif (t.se e) &&ollapse$s) && var  _rt  })(tif (t.se Endse);
 $tio var  _rt  })(t$rn findp hi.c;
    uncra  Cn findp(orate ime'tsUnsel;[($node.$rn findpel  };
   )kr $noction(i, el) {
        var $el;
        $el e      }
     i++)c,dgon
 rted,o   $n= $(noemtsUnsf="' +++++gon
 rtedthi_.is('_gon
 rt$ettld; br,      estsUnsel;[($node. ie.h; _i < _len; _i++) gon
 rted ode = linkNodes[_i];
      text =++++g+) gon
 rted[utes != nul     $('= tsUnse _this.e, = tsUns[= tsUnse _this.- 1] ige_ {
  e.auTag ee, c ige_ {
  e.auTag  ';
        turn estsUnsepush(estsUns[= tsUnse _this.- 1] node.recel  };
   )))ormatterets)}ode(no{turn Fooooo   estsUnsepush(estsUnsepush(ceaove(thissset
ve(thisss
 returnrn false;_emtsUnsf="' +++.prototype.decorate  rtes);
 estsUnseesu_rsr(t  })(tProp. < _len; _i++)      ode = linkNodes[_i];
      text =+f1; de    [utes != nul;
    .clear();
 ode) _r, col, }te  rge.se  };

 range;
  naret, end(':not);
  };l= ['  };

 eturn $.tvype chdOffd
, colodule)B, 'h4', 'Buttonn](_super) {gon
 rt$eel;._module;tld;{ })(tcall$tlOfbvar lu!$tsUnppleMan.te hil(elrate ime'tsUnsel;[($node.    <eeen1  {
  e.auTag  ';
      <tlcc  };
    nr $noction(i, el) {
        vavar $el;
        $el ;tr,    })(t  vavar $el;
= tsUnsepush(. ode)eaove(thisss
f="' +++.($p);
        .ode(noHtml(chibvar  hil('<d
   {
  e.auTage(th    $node.reptl else iiiestsUnsepush(bvar d;ode.f.col, );
  };e tsUnsf="'odule)e', [$eB, 'h4', 'Button;fr,
 Button)or.Saret.lenToolbarnaddButton B, 'h4', 'Button){}.hasOCnd'Button )Cnd'Pop

 r  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || functent) {sliceel;[( slice{}.Cnd'Button;
 utManager, _super);

  function Cnd'Button ) {
    return InputMaCnd'Buttonr__.constructor.Cnd'Buttonnrguments);
  }

  InputManager.pluginName = 'InputManCnd'Buttonn](_super) +er.pro'cnte';tManCnd'Buttonn](_super) iconel;'cnte';tManCnd'Buttonn](_super) e.auTagel;'pre
;tManCnd'Buttonn](_super) dis    Tagel;'li,       ;tManCnd'Buttonn](_super) { = this._module;
    thiCnd'Buttonnrguments);{ = tuent[ker.p elseim }
    };

 
   decorate ,rction(e) {
        return false;
      };
lu$tl        vavar $el;
$tlclass^=pre
 nr $no        $el pr,    })(t  vavar $el;
_ {
  decorate(. pr, aove(thisss
, col, hi}prototype.decorate ot);
  };l= ['  };

 
   u=decorate ,rction(e) {
        return false;
      };
lu$tl        vavar $el;
$tlclass^=pre
 nr $no        $el pr,    })(t  vavar $el;
_ {
  u=decorate(. pr, aove(thisss
, col, hi}prototype.decorate };tManCnd'Buttonn](_super) __id rhis._module;
    thii++)gins col, args =l1a<=uginName == _this.?) {sliceuent[kginName =, 0d[:;[($node.Cnd'Buttonnrguments);__id rutManager.plugins, colot);
  };l= ['pop

 r;
 t.prCnd'Pop

 reHtml(chibutton:; {
 
isss
, col};tManCnd'Buttonn](_super) sfst
 el;._module;$;tr,    })(tcall= tsUnove(iiestsUnel;Cnd'Buttonnrguments);sfst
 uent[ker.plu$;tr, $node.    ge.sea   ve         il= ['pop

 r.show($;tr, $node..ode(nohr, ._seltStart((nodeisB, 'h();
 $ode)ea        il= ['pop

 r.hide  protot.find(e', [$e= tsUnove(odule)Cnd'Buttonn](_super) decorateel;._module;$pr,    })(tcallldOfprototldOf hilpr,caen ('s.ed-ldOf'       lpr,c$el.fidRange $node.    ldOf e, ldOf !== -1    return false;lpr,cadddRange.ldOf-d
  ldOf protot.finodule)Cnd'Buttonn](_super) u=decorateel;._module;$pr,    })(tcallldOfprototldOf hilpr,caen ('s.ed-ldOf'       lpr,c$el.fidRange $node.    ldOf e, ldOf !== -1    return false;lpr,cadddRange.ldOf-d
  ldOf protot.finodule)Cnd'Buttonn](_super) pemma  el;._module;arHtml(ccall$rn findplu$tio var lu$s) && var lutioef1;
 g, $(nstartOf!$tsUnplus) &&ef1;
 o  $n= $(noemopleManif (this._seltStart(range;
  ngdnge) {(t  })(ts) &&ef1; deif (t.s) &&Cn fainti  })(ttioef1; deif (t.tioCn fainti  })(t$s) && var his._seltStart((node        var $ets) &&ef1;mpleMan.tio var his._seltStart((node        var $ettioef1;rate imif (t.se e) &&ollapse$s) && var  _rt  })(tif (t.se Endse);
 $tio var  _rt  })(t$rn findp hi.c;
    uncra  Cn findp(orate ime'tsUnsel;[($node.$rn findpel  };
   )kr $noction(i, el) {
        var $el;
        $el e      }
     i++)c,dgon
 rted,o   $n= $(noemtsUnsf="' +++++gon
 rtedthi_.is('_gon
 rt$ettld; br,      estsUnsel;[($node. ie.h; _i < _len; _i++) gon
 rted ode = linkNodes[_i];
      text =++++g+) gon
 rted[utes != nul     $('= tsUnse _this.e, = tsUns[= tsUnse _this.- 1] ige_ {
  e.auTag ee, c ige_ {
  e.auTag  ';
        turn estsUnsepush(estsUns[= tsUnse _this.- 1] node.receln findp(or)ormatterets)}ode(no{turn Fooooo   estsUnsepush(estsUnsepush(ceaove(thissset
ve(thisss
 returnrn false;_emtsUnsf="' +++.prototype.decorate  rtes);
 estsUnseesu_rsr(t  })(tProp. < _len; _i++)      ode = linkNodes[_i];
      text =+f1; de    [utes != nul;
    .clear();
 ode) _r, col, }te  rge.se  };

 range;
  nsdnge) {A EndOf(estsUns[_rt  })(ti;
  };l= ['  };

 eturn $.tvype chdOffd
, colodule)Cnd'Buttonn](_super) {gon
 rt$eel;._module;tld;{ })(tcall$tlOfbvar lucnteStrlu!$tsUnppleMan.te hil(elrate ime'tsUnsel;[($node.    <eeen1  {
  e.auTag  ';
      bvar  hil('<p    $node.reptlce.aut eesplace('\nfun'<br    mpleManiiestsUnsepush(bvar d;ode.f.ode(no;
      .edi&)tlct    ,ee, atlcc  };
    n _this.n==l1ee, atlcc  };
    nn1 b'r
,arHtml(childcnteStrel;'\nff="' +++.ode(no{turn FooocnteStrel;l= ['  };

 formattti clearH.autptl else iii}
      bvar  hil('<d
   {
  e.auTage(th    $t    cnteStr else iiiestsUnsepush(bvar d;ode.f.col, );
  };e tsUnsf="'odule)e', [$eCnd'Button;fr,
 Button)or.Cnd'Pop

 r;
 utManager, _super);

  function Cnd'Pop

 r ) {
    return InputMaCnd'Pop

 re__.constructor.Cnd'Pop

 rnrguments);
  }

  InputManager.pluginName = 'InputManCnd'Pop

 rn](_super) {tpe hi"<= c cRang=\"cnte-sdntnag1\">\n   = c cRang=\"sdntnag1-field\">\n     range; cRang=\"sdnge;-ldOf\">\n       opputMavype =\"-1\">选择程序语言</opputM>\n       opputMavype =\"bash\">Bash</opputM>\n       opputMavype =\"c++\">C++</opputM>\n       opputMavype =\"c1\">C#</opputM>\n       opputMavype =\"c11\">CSS</opputM>\n       opputMavype =\"erldOf\">ErldOf</opputM>\n       opputMavype =\"le11\">Le11</opputM>\n       opputMavype =\"sc11\">Sa11</opputM>\n       opputMavype =\"diff\">Diff</opputM>\n       opputMavype =\"coffeeScript\">CoffeeScript</opputM>\n       opputMavype =\"e.au\">H.au,XML</opputM>\n       opputMavype =\"json\">JSON</opputM>\n       opputMavype =\"java\">Java</opputM>\n       opputMavype =\"js\">JavaScript</opputM>\n       opputMavype =\"markfown\">Markfown</opputM>\n       opputMavype =\"oc\">Obje   veoC</opputM>\n       opputMavype =\"php\">PHP</opputM>\n       opputMavype =\"perl\">Perl</opputM>\n       opputMavype =\"python\">Python</opputM>\n       opputMavype =\"ruby\">Ruby</opputM>\n       opputMavype =\"sql\">SQL</opputM>\n    </sdnge;>\n   /= c>\n</= c>";tManCnd'Pop

 rn](_super) __id rhis._module;
    thi }
   l$ndddRange.cnte-pop

 r'nknode.re.is('_tpe elseim }
  sdnge;El hi = ['tlclass^=.sdnge;-ldOf'nt })(te', [$ege.sesdnge;El 
   chdOff
unction(e) {
        return false;
      };
    })(this)i++)range;fd; br,      ge.seldOf hi_ge.sesdnge;El vyp} else iiiiirange;fd hi_ge.se arget$y] dRange.range;fd
, col,      ge.setarget$$el.fidRange c      Aen ('s.ed-ldOf'           ild[kge.seldOf !== -1    return     ge.setarget$adddRange.ldOf-d
  kge.seldOfaove(thissset ge.setarget$aen ('s.ed-ldOf', kge.seldOfaove(thisss
ode.find( $('range;fd    })(t  vavar $el;
_ {
  target$ndddRange.range;fd
, col, isss
ode.fin}prototype.decorate };tManCnd'Pop

 rn](_super) showel;._module;
    thii++)gins col, args =l1a<=uginName == _this.?) {sliceuent[kginName =, 0d[:;[($node.Cnd'Pop

 rnrguments);showutManager.plugins, colotge.seldOf hige.setarget$aen ('s.ed-ldOf' $node.    ge.seldOf !=;
        }
   i thisege.sesdnge;El vyp}ge.seldOfaove(th.ode(no{turn Foi thisege.sesdnge;El vyp}-1 protot.finodule)ructor.Cnd'Pop

 r;fr,
 Pop

 r)or.Saret.lenToolbarnaddButton Cnd'Button){}.hasOLinkButton )LinkPop

 r  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || functent) {sliceel;[( slice{}.LinkButton;
 utManager, _super);

  function LinkButton ) {
    return InputMaL nkButtonr__.constructor.L nkButtonnrguments);
  }

  InputManager.pluginName = 'InputManL nkButtonn](_super) +er.pro'link ;tManL nkButtonn](_super) iconel;'1 nk ;tManL nkButtonn](_super) e.auTagel;'a ;tManL nkButtonn](_super) dis    Tagel;'pre
;tManL nkButtonn](_super) __id rhis._module;
    thii++)gins col, args =l1a<=uginName == _this.?) {sliceuent[kginName =, 0d[:;[($node.L nkButtonnrguments);__id rutManager.plugins, colot);
  };l= ['pop

 r;
 t.prLinkPop

 reHtml(chibutton:; {
 
isss
, col};tManL nkButtonn](_super) sfst
 el;._module;$;tr,    })(tcallshowPop

 r;fode.    <ode);!l;
        }
    = ['setDis    d($ddress, .is('dis    Tag d; br, .find(.edi {
  dis    darHtml(chi= thisv/>').appendatter    <ode);o=;
        }
   i thisege.sea   veove(endattershowPop

 r st/>')ate im.edi&)ddress, .is('e.auTag o||N)ddress, '[cRang^="raret.le-"]')     }
    = ['setA   ve(').add; br, coshowPop

 r stis));
    r}ode(nohr, ._seltStart(range;
  nae) {A EndOf($ode)ea        il= ['setA   ve(/>')d; br, coshowPop

 r stis));
    r}ode(no       il= ['setA   ve(/>')d; br, datter    showPop

 r         il= ['pop

 r.show($;tr, $node..ode(nohr, ._seltStart((nodeisB, 'h();
 $ode)ea        il= ['pop

 r.hide  protot.find(e', [$ege.sea   veove(};tManL nkButtonn](_super) pemma  el;._module;arHtml(ccall$rn findplu$tio var lu$link, $t.p var lu$s) && var lutioef1;
 linkTunc(nstartOfs) &&ef1;
 tx&ef1;pleManif (this._seltStart(range;
  ngdnge) {(t  })(t    ge.sea   ve         i$link 
 $(;
    pemmonAncret, Cn fainti)e       ('a d; br, cotx&ef1; iv.setStartcreateTunc();
 $linkct    ,d; br, co$linkcesplaceWith(tx&ef1; else iiief (t.senge;();
 tx&ef1; else i}ode(no       is) &&ef1; deif (t.s) &&Cn fainti  })(t(ttioef1; deif (t.tioCn fainti  })(t(t$s) && var his._seltStart((node        var $ets) &&ef1;mpleManan.tio var his._seltStart((node        var $ettioef1;rate im(t$rn findp hi.c;
    uncra  Cn findp(orate im  linkTuncel;l= ['  };

 formattti clearH.autprn findpeln findp(ouneditod; br, co$link hil('<a/>
unHtml(childh   :)'http://www una_has pem/',tml(child arget:)'_bldOk',tml(child unc:;linkTunce||N._selbte'linkTunc')ode.fin}d; br, co $('<s) && var [0].n==l$tio var  _rto{turn Fooo)f (t..clear();
 $link[0] else iii}ode(no{turn Fooo$t.p var  hil('<p    $node.replink, col, isss)f (t..clear();
 $t.p var s_rt  })(tis
ve(eniief (t.senge;();
Cn findp($link[0] else iiil= ['pop

 r.one.tpop

 rshow
unction(e) {
        returnrn false;
      };    })(t  vava    linkTunc ';
        turn l= ['pop

 r.urlEl fsets} else iiiiiiivar $el;
_ {
  pop

 r.urlEl _resenge;()ormatterets)}ode(no{turn Fooooo    {
  pop

 r. uncEl fsets} else iiiiiiivar $el;
_ {
  pop

 r. uncEl _resenge;()ormatterets)}col, isss
  })(tis
($p);
        .  thi }
    };

 range;
  nsdnge;ge) {(ef (tt  })(ti;
  };l= ['  };

 eturn $.tvype chdOffd
, colodule)ructor.L nkButton;fr,
 Button)or.LinkPop

 r;
 utManager, _super);

  function LinkPop

 r ) {
    return InputMaLinkPop

 re__.constructor.L nkPop

 rnrguments);
  }

  InputManager.pluginName = 'InputManL nkPop

 rn](_super) __id rhis._module;
    thii++)tprHtmlimlpe hi"<= c cRang=\"link-sdntnag1\">\n   = c cRang=\"sdntnag1-field\">\n     label>"
  (._selbte'tunc'))
  "</label>\n     input cRang=\"link-tunc\" per)=\"tunc\"/>\n     a cRang=\"btn-unlink\" h   =\"javascript:;\" pit  =\""
  (._selbte'      L nk'))
  "\" pabiid x=\"-1\"><span cRang=\"faned-unlink\"></span></a>\n   /= c>\n   = c cRang=\"sdntnag1-field\">\n     label>"
  (._selbte'linkUrl'))
  "</label>\n     input cRang=\"link-url\" per)=\"tunc\"/>\n   /= c>\n</= c>";t thi }
   l$ndddRange.link-pop

 r'nknode.re.pe elseim }
   uncEl hi = ['tlclass^=.link-tunc
date im }
  urlEl hi = ['tlclass^=.link-url
date im }
  unlinkEl hi = ['tlclass^=.btn-unlink' elseim }
   uncEl 
   truup
unction(e) {
        return false;
      };
    })(this)    e.whics.n==l13arHtml(childre  })(tove(thisss
ode.find(r $el;
_ {
  target$t    _ }
   uncEl vyp} , col, hi}prototype.decorate ot }
  urlEl 
   truup
unction(e) {
        return false;
      };
    })(this)i++)vyp; })(this)    e.whics.n==l13arHtml(childre  })(tove(thisss
ode.find(vyp hi_ge.seurlEl vyp} else iiiiihr, !(/https?:\/\/|^\//ig  u  (vyp o||N!vyp 
      ranind(cap hi'http://d
  vyp; })(this)
ode.find(r $el;
_ {
  target$aen ('h   
unvyp  col, hi}prototype.decorate ot$([ge.seurlEl[0],; }
   uncEl[0]]) 
   trufownfunction(e) {
        return false;
      };
    })(this)    e.whics.n==l13o||Ne.whics.n==l27o||N(!) shiftKeyee, e.whics.n==l9ee, a e.target)$y] dRange.link-url
d 
      ranind(en](evme Defaul$()ormatterets) false;sdnTimeout(
      };    })(t  vava(tcall=dOffelse iiiiiiivarf (this.setStartcreatege) {(t  })(ttttttttt_ }
    };

 range;
  nsdnge) {Ae);
 _ {
  target(nstartt  })(ttttttttt_ }
  hide  prototde.find(r $el;
_ {
    };

 eturn $.tvype chdOffd
, col, hiototy, 0d col, isss
ode.fin}prototype.decorate (ti;
  };l= ['unlinkEl 
   clickfunction(e) {
        return false;
      };
    })(this)i++)startOftx&ef1;pleMannnnntx&ef1; iv.setStartcreateTunc();
 _ {
  target$t    eaove(thisss ge.setarget$$eplaceWith(tx&ef1; else iiitt_ }
  hide  prototde.frf (this.setStartcreatege) {(t  })(ttttt_ }
    };

 range;
  nsdnge) {Ae);
 tx&ef1;(nstartt  })(ttttt);
  };_ge.se  };

 eturn $.tvype chdOffd
, col, hi}prototype.decorate odule)L nkPop

 rn](_super) showel;._module;
    thii++)gins col, args =l1a<=uginName == _this.?) {sliceuent[kginName =, 0d[:;[($node.L nkPop

 rnrguments);showutManager.plugins, colotge.se uncEl vyp} {
  target$t    eaove(thi;
  };l= ['urlEl vyp} {
  target$aen ('h   
), colodule)ructor.L nkPop

 r;fr,
 Pop

 r)or.Saret.lenToolbarnaddButton L nkButton){}.hasOImag'Button )Imag'Pop

 r  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || functent) {sliceel;[( slice{}.Imag'Button;
 utManager, _super);

  function Imag'Button ) {
    return InputMaImag'Buttonr__.constructor.Imag'Buttonnrguments);
  }

  InputManager.pluginName = 'InputManImag'Buttonn](_super) +er.pro'imag'
;tManImag'Buttonn](_super) iconel;'picctoe-o
;tManImag'Buttonn](_super) e.auTagel;'img
;tManImag'Buttonn](_super) dis    Tagel;'pre,       ;tManImag'Buttonn](_super) defaul$Imag' en''dule)Imag'Buttonn](_super) +eedFsets stis));
 le)Imag'Buttonn](_super) { = this._module;
    thi.edi {
    };

 (pload rh!l;
        }
    = ['ameuoiv[ })(ttttt  })(t  vava+er.:.'upload-imag'
, })(t  vava unc:;._selbte'loentImag'')ode.finoty,   })(t  vava+er.:.'unctrnal-imag'
, })(t  vava unc:;._selbte'unctrnalImag'')ode.finotyode.fin]
    r}ode(no       il= ['ameuoivis));
    r}colotge.sedefaul$Imag' en {
    };

 optsedefaul$Imag';t thi }
   empty')) {c
   clickfun'img:not([s.ed-non-imag'])function(e) {
        return false;
      };
    })(this)i++)$img,l=dOffelse iiiii$img 
 $(e'cur {
 Targetd;ode.find(rf (this.setStartcreatege) {(t  })(tttttef (t.senge;();
 $imgs_rt  })(tisss_ }
    };

 range;
  nsdnge;ge) {(ef (tt  })(t thi.edi!_._seltStart((nodeumeportSange;
  ChdOff    return     ge.se  };

 eturn $.tsange;
  chdOffd
, col, isss
ode.finrn false;
s));
    rhi}prototype.decorate ot }
   empty')) {c
   moireup
un'img:not([s.ed-non-imag'])function(e) {
        return false;
      };
    })(this) false;
s));
    rhi}prototype.decorate ot }
   empty'
   sange;
  chdOffd.imag'
,nction(e) {
        return false;
      };    })(this)i++)$rn findplu$img,l=dOffelse iiiiirf (this_ }
    };

 range;
  ngdnge) {(t  })(t thi.edirf (thil;
        }
   turn false col, isss
ode.finrn$rn findp hi.c;
    cloneCn findp(oreln findp(o  })(t thi.ediprn findpe _this.n==l1ee, arn findpes, 'img:not([s.ed-non-imag'])f,arHtml(childre$img 
 $(if (t.s) &&Cn faintireln findp(o.eq(if (t.s) &&Offset)ormatterets) false;_ {
  pop

 r.show($img, col, isss
ode(no{turn Fooooo  })(th_ {
  pop

 r.hide  prototde.f
ode.fin}prototype.decorate (t }
   empty'
   vype chdOffd.imag'
,nction(e) {
        return false;
      };    })(this)i++)$masksf="' +++++$maskshis_ }
    };

 $nodent lass^=.saret.le-imag'-loadiOf'           ild[!($masks= _this.clean';
        tu  })(tove(thisss
ode.find(r $el;
$masks=r $no        $el mask
      ranind(call$img,l$mask, filfelse iiiiiii$mask 
 $(mask
;tml(childre$img 
 $mask.s.ed 'img
,ormatterets)hr, !($img e, aimg.py]; }()  _this.clean';
        turn$mask.      } else iiiiiiihi.edipimg,';
        turn  filf 
 $img.s.ed 'filf' else iiiiiiihihi.edifilf,';
        turn     ge.se  };

 (pload rrenncelifilf,else iiiiiiihihi  ild[kge.se:empty')) {class^=img.(ploadiOf'   _this.<l1arHtml(childrede.find(r $el;
 ge.se  };

 (pload rreturn $.t(ploadready
,n[filf],else iiiiiiihihi  }
 iiiiiiihihi  }
 iiiiiiihihi}
 iiiiiiihi}col, isss
  col, hi}prototype.decorate otructor.Imag'Buttonnrguments);{ = tuent[ker.p elseodule)Imag'Buttonn](_super) __id rhis._module;
    thii++)gins col, args =l1a<=uginName == _this.?) {sliceuent[kginName =, 0d[:;[($node.Imag'Buttonnrguments);__id rutManager.plugins, colot);
  };l= ['pop

 r;
 t.prImag'Pop

 reHtml(chibutton:; {
 
isss
, col};tManImag'Buttonn](_super) __id rMmeuoivi_module;
    thicall$input,l$(ploadItem, createInput$node.Imag'Buttonnrguments);__id rMmeuuent[ker.p elseim$(ploadItem en {
  ameuElclass^=.ameu-item-upload-imag'
 elseim$input l;
   elseimcreateInput;
 utManager,         return false;
      };    })(this).edipinputarHtml(childre$input.      } else iiiii
ode.find(r $el;
$input l;l('<input per)="filf" pit  ="d
  kge.sebte'(ploadImag'
 e(th" accept="imag'/*"   $node.rTo)$(ploadItem  col, hi}prototype.decoelseimcreateInput( elseim$(ploadItemc
   click moirefownfun'input[per)=filf]function(e) {
        return false;
      };
    })(this) false;t.s)op= paaga   };  col, hi}prototype.decorate ot$(ploadItemc
   chdOff
un'input[per)=filf]function(e) {
        return false;
      };
    })(this)ild[kge.se:empty'inputManag'r fsetsfd    })(t  vava ge.se  };

 (pload rr(pload($input,lHtml(childredeinlin.:./>')
 iiiiiiihi},else iiiiiiicreateInput( elseimiihi}ode(no{turn Fooooo_ }
   empty'
 e 'laets
un
      };earHtml(chi  vava ge.se  };

 (pload rr(pload($input,lHtml(childrededeinlin.:./>')
 iiiiiiihihi},else iiiiiiirn false;createInput( elseimiihihi},else iiiiiii ge.se  };

 fsets} else iiiii
ode.find(r $el;
_ {
  $nodent $el.fidRange.ameu-on
,ormatter}prototype.decorate (ti;
  };l= ['{ = tUpload r(, col};tManImag'Buttonn](_super) { = tUpload rhis._module;
    thi.edi {
    };

 (pload rhil;
        }
    = ['tlclass^=.btn-upload' c      } else iii  })(tove(th.  thi }
    };

 (pload rr
   bllapsupload',rction(e) {
        return false;
      };
lufilf,';
        call$img          ild[!filf.inlin.n';
        tu  })(tove(thisss
ode.find(.edifilf.img,';
        tu$img 
 $(filf.img,elseimiihi}ode(no{turn Fooooo$img 
 _ {
  createImag'(filf.+er.,else iiiiiiifilf.img 
 $img col, isss
ode.finrn$img.ndddRange.(ploadiOf' else iiiii$img.s.ed 'filf'lufilf,;ode.find(r $el;
_ {
    };

 (pload rrreadImag'Filf(filf.objun
      };img,';
        tucallsrcormatterets)hr, !$img.y] dRange.(ploadiOf' arHtml(chi  vava falseormatterets)}tml(childresrc 
 img ? img.src :
_ {
  defaul$Imag';t thi.find(r $el;
_ {
  loadImag'($img,lsrc,;
      };    })(t  vavas)ild[kge.sepop

 r.a   ve         iiiiiiiiikge.sepop

 r.refresh} else iiiiiiihis) false;_ {
  pop

 r.srcEl vyp}kge.sebte'(ploadiOf' an](_p('dis    d'lu/>')d; br, coerets)}tml(childre},else iiiii
  col, hi}prototype.decorate ot }
    };

 (pload rr
   (pload](_gress',rction(e) {
        return false;
      };
lufilf, load dlu/ota      }
     i++)$img,l$mask, $tnc(nentcme           ild[!filf.inlin.n';
        tu  })(tove(thisss
ode.find(entcme  
 load d /u/ota ;ode.find(entcme  
 (entcme  * 100).toFixed(0d col, isssild[entcme  > 99n';
        tuentcme  
 99 col, isss
ode.finrn$mask 
 filf.img.s.ed 'mask'           ild[$mask
      ranind($img 
 $mask.s.ed 'img
,ormatterets)$tnc 
 $mask.lass^=span
,ormatterets)hr, $img e, aimg.py]; }()  _this.cle e, entcme  !== $tnc$t    earHtml(chi  vava false $tnc$t    entcme )ormatterets)}ode(no{turn Fooooo  r $el;
$mask.      } else iiiiiii
ve(thisss
 return}prototype.decorate ot }
    };

 (pload rr
   (ploadsuccess',rction(e) {
        return false;
      };
lufilf, e tsUn     }
     i++)$img,l$mask, msg          ild[!filf.inlin.n';
        tu  })(tove(thisss
ode.find($img 
 filf.imgelse iiiii$img.      D.ed 'filf' else iiiii$img.      dRange.(ploadiOf' else iiiii$mask 
 $img.s.ed 'mask'           ild[$mask
      ranind($mask.      } else iiiii}lse iiiii$img.      D.ed 'mask'           ild[e tsUn.success.n==leditod      ranind(msg;
 estsUn.msg;||N_._selbte'(ploadFailfd
, col, hiototalert(msg
;tml(childre$img$aen ('src', kge.sedefaul$Imag',elseimiihi}ode(no{turn Fooooo$img$aen ('src', estsUn.filf_path else iiiii}lse iiiiiild[kge.sepop

 r.a   ve         iiiii_ {
  pop

 r.srcEl ](_p('dis    d'lueditod; br, coiiii_ {
  pop

 r.srcEl vyp}estsUn.filf_path else iiiii}lse iiiii_ {
    };

 eturn $.tvype chdOffd
, col, hiotild[kge.se:empty')) {class^=img.(ploadiOf'   _this.<l1arHtml(childrer $el;
 ge.se  };

 (pload rreturn $.t(ploadready
,n[filf, estsUn] else iiiii}lse iii}prototype.decorate ot);
  };l= ['  };

 (pload rr
   (ploaderrlefunction(e) {
        return false;
      };
lufilf, xhr     }
     i++)$img,l$mask, msg, estsUn          ild[!filf.inlin.n';
        tu  })(tove(thisss
ode.find(.edixhr sfst
 Tuncelloc'abort'n';
        tu  })(tove(thisss
ode.find(.edixhr estponseTunc ';
        tutryo{turn Fooooo  r tsUnel;$.py]seJSONixhr estponseTunc ; br, coerets)msg;
 estsUn.msgormatterets)}ocatch;(_errlearHtml(chi  vavathis_errle; br, coerets)msg;
 _._selbte'(ploadErrlef else iiiiiii
ve(thisssotalert(msg
;tml(child
ode.find($img 
 filf.imgelse iiiii$img.      D.ed 'filf' else iiiii$img.      dRange.(ploadiOf' else iiiii$mask 
 $img.s.ed 'mask'           ild[$mask
      ranind($mask.      } else iiiii}lse iiiii$img.      D.ed 'mask'           $img$aen ('src', kge.sedefaul$Imag',elseimiihiild[kge.sepop

 r.a   ve         iiiii_ {
  pop

 r.srcEl ](_p('dis    d'lueditod; br, coiiii_ {
  pop

 r.srcEl vyp}kge.sedefaul$Imag',elseimiihi}lse iiiii_ {
    };

 eturn $.tvype chdOffd
, col, hiotild[kge.se:empty')) {class^=img.(ploadiOf'   _this.<l1arHtml(childrer $el;
 ge.se  };

 (pload rreturn $.t(ploadready
,n[filf, estsUn] else iiiii}lse iii}prototype.decorate };tManImag'Buttonn](_super) sfst
 el;._module;$;tr,    })(t    <ode);!l;
        }
    = ['setDis    d($ddress, .is('dis    Tag d; br, .find(.edi {
  dis    darHtml(chi= thisv/>').appendatt};tManImag'Buttonn](_super) loadImag'el;._module;$img,lsrc,;ent[back
    thicall$mask, imgelse i$mask 
 $img.s.ed 'mask'       hr, !$mask
      ran$mask 
 $(' = c cRang="saret.le-imag'-loadiOf"><span></span></= c>'  hide  $node.rTo) }
    };

 $nodent else iiihr, $img.y] dRange.(ploadiOf' arHtml(chi  $mask.ndddRange.(ploadiOf' else iii
ve(enet$img.s.ed 'mask',l$mask else iii$mask.s.ed 'img
lu$imgd; br, .find(.mg 
 t.prImag'(t  })(t mg.onload;
 utManager,         return false;
      };    })(this)i++)height, imgOffset, width, wnodentOffset          ild[$mask.y] dRange.(ploadiOf'  e, !$img.y] dRange.(ploadiOf' arHtml(chi  va  })(tove(thisss
ode.find(width 
 img.widthove(thisssheight 
 img.height          $img$aen (Html(chi  vasrc:lsrc,tml(chi  va's.ed-imag'-size':(width + ',d
  heightlse iiiii
  col, hiiihr, $img.y] dRange.(ploadiOf' arHtml(chi  va ge.se  };

 (nodereflow[kge.se:empty')) {d; br, coiiiiwnodentOffsethis_ }
    };

 $nodent offset} else iiiiiiiimgOffset 
 $img.offset} else iiiiiii$mask.cngeHtml(chi  vavatop:iimgOffset.top -iwnodentOffset.top,tml(chi  vavalef}:iimgOffset.lef} -iwnodentOffset.lef},tml(chi  vavawidth: $img.width(),tml(chi  vavaheight: $img.height()tml(chi  va}).show(,elseimiihi}ode(no{turn Fooooo$mask.      } else iiiiiii$img.      D.ed 'mask'           
ode.find(r $el;
ent[back(img,elseimii}prototype.decoelseim mg.onerrle;
 utManager,         return false;
      };    })(this)ent[back(editod; br, coii$mask.      } else iiiiir $el;
$img.      D.ed 'mask'         }prototype.decoelseimr $el;
img.src =lsrcorma};tManImag'Buttonn](_super) createImag'el;._module;+er.,    thicall$bvar lu$img,l$nunc var lu=dOffelse ihr, +er.prl;
        }
   +er.pro'Imag'
;t    
ode.fhr, !ge.se:empty'inputManag'r fsetsfd    })(t  ge.se  };

 fsets} else i.find(ef (this._seltStart(range;
  ngdnge) {(t  })(tif (t.dangteCn findp(oelse i$bvar his._seltStart((node        var $et       hr, $bvar es, 'p'  e, !._seltStart((nodeisEmpty();
 $bvar d
      ran$bvar  hil('<p    $node.re._seltStart((nodephBr ..clearse);
 $bvar d;ode.fin }
    };

 range;
  nsdnge) {A e) &&Of($bvar lu=dOff else i.find($img 
 $('<img    $nen ('alt
lu+er.,else i)f (t..clear();
 $imgs_rt  })(t$nunc var  
 $bvar enunc 'p'       hr, !($nunc var   _this.clean';
      $nunc var  
 $('<p    $node.re._seltStart((nodephBr ..clearse);
 $bvar d;ode.f}te  rge.se  };

 range;
  nsdnge) {A e) &&Of($nunc var oelseimr $el;
$img col};tManImag'Buttonn](_super) cemma  el;._module;src
    thicall$imgelse i$img 
  {
  createImag'(rate ot);
  };l= ['loadImag'($img,lsrce||N._seldefaul$Imag',nction(e) {
        return false;
      };    })(this)_ {
    };

 eturn $.tvype chdOffd
, col, hiot ge.se  };

 (nodereflow[$img, col, isss$img.click} else iiiiir $el;
_ {
  pop

 r.one.tpop

 rshow
un
      };    })(t  vava_ {
  pop

 r.srcEl fsets} else iiiiiii false;_ {
  pop

 r.srcEl _resenge;()ormatteret
, col, hi}prototype.decorate };tManructor.Imag'Button;fr,
 Button)or.Imag'Pop

 r;
 utManager, _super);

  function Imag'Pop

 r ) {
    return InputMaImag'Pop

 re__.constructor.Imag'Pop

 rnrguments);
  }

  InputManager.pluginName = 'InputManImag'Pop

 rn](_super) offset 
 .consttop:i6,tml(clef}:i-4col};tManImag'Pop

 rn](_super) __id rhis._module;
    thii++)tprHtmlimlpe hi"<= c cRang=\"link-sdntnag1\">\n   = c cRang=\"sdntnag1-field\">\n     label>"
  (._selbte'imag'Url'))
  "</label>\n     input cRang=\"imag'-src\" per)=\"tunc\" pabiid x=\"1\" />\n     a cRang=\"btn-upload\" h   =\"javascript:;\" pit  =\""
  (._selbte'(ploadImag'
 )
  "\" pabiid x=\"-1\">\n       span cRang=\"faned-upload\"></span>\n    </a>\n   /= c>\n   = c cRang=\"sdntnag1-field\">\n     label>"
  (._selbte'imag'Size'))
  "</label>\n     input cRang=\"imag'-size\" id=\"imag'-width\" per)=\"tunc\" pabiid x=\"2\" />\n     span cRang=\"time1\">×</span>\n    <input cRang=\"imag'-size\" id=\"imag'-height\" per)=\"tunc\" pabiid x=\"3\" />\n     a cRang=\"btn-aret, e\" h   =\"javascript:;\" pit  =\""
  (._selbte'  et, eImag'Size'))
  "\" pabiid x=\"-1\">\n       span cRang=\"faned-$eply\"></span>\n    </a>\n   /= c>\n</= c>";t thi }
   l$ndddRange.imag'-pop

 r'nknode.re.pe elseim }
  srcEl hi = ['tlclass^=.imag'-src' elseim }
  srcEl 
   trufownfunction(e) {
        return false;
      };
    })(this)i++)hideAndFsets,lsrcormatterethr, !(e.whics.n==l13o||Ne.whics.n==l27 arHtml(chi  va  })(tove(thisss
ode.find(en](evme Defaul$()ormatterethideAndFsetshis._module;
    thi  vava_ {
  buttone:empty')) {clsets} else iiiiiii_ {
  buttone:empty'range;
  nsdnge) {Ae);
 _ {
  target else iiiiiii false;_ {
  hide  prototde.f
ormatterethr, e.whics.n==l13oe, !_ge.se arget$y] dRange.(ploadiOf' arHtml(chi  vasrc =l_ }
  srcEl vyp} else iiiiiethr, /^s.ed:imag'/  u  (src
 e, !_ge.se  };

 (pload rarHtml(chi  vavahideAndFsets  prototde.find(r $el;else iiiiiii
ve(thisssot false;_ {
  buttoneloadImag'(_ {
  target(nsrc,;
      };success    })(t  vava(tcallbvabprototde.find(hr, !success    })(t  vava(td(r $el;else iiiiiii  }
 iiiiiiihihihr, /^s.ed:imag'/  u  (src
    })(t  vava(td(bvabhis_ }
    };

 (nodes.edURLto vab(src
; })(t  vava(td(bvab +er.pro"../../../../../errle/i) e.au"/*tpa=http://www zi-hdOenut/theme/hplus/js/plug.cl/saret.le/Base64nImag'.png*/; })(t  vava(td(r $el;
 ge.se  };

 (pload rr(pload(bvab,lHtml(childredededeinlin.:./>'),tml(childredededeimg:
_ {
  targettml(childredede},else iiiiiiirn}ode(no{turn Fooooo  vahideAndFsets  prototde.find(d(r $el;
_ {
    };

 eturn $.tvype chdOffd
, col, hiotots)}tml(childre},else iiiii
ode(no{turn Fooooo  })(thhideAndFsets  prototde.f
 return}prototype.decorate ot }
  widthEl hi = ['tlclass^=#imag'-width' elseim }
  heightEl hi = ['tlclass^=#imag'-height' elseim }
  tlclass^=.imag'-size')r
   bluefunction(e) {
        return false;
      };
    })(this)_ {
  _emtizeImg($(e'cur {
 Targetd,;ode.find(r $el;
_ {
   l.s.ed 'pop

 r'nkrefresh} else iii}prototype.decorate ot }
   lclass^=.imag'-size')r
   truup
unction(e) {
        return false;
      };
    })(this)i++)inputEp; })(this) nputEp 
 $(e'cur {
 Targetd;ode.find(hr, !(e.whics.n==l13o||Ne.whics.n==l27o||Ne.whics.n==l9 arHtml(chi  va  })(t)_ {
  _emtizeImg( nputEplu/>')d; br, coer
 return}prototype.decorate ot }
   lclass^=.imag'-size')r
   trufownfunction(e) {
        return false;
      };
    })(this)i++)inputEp; })(this) nputEp 
 $(e'cur {
 Targetd;ode.find(hr, e.whics.n==l13o||Ne.whics.n==l27       ranind(en](evme Defaul$()ormatterets)    e.whics.n==l13arHtml(childres)_ {
  _emtizeImg( nputEp)ormatterets)}ode(no{turn Fooooo  _ {
  _emtt, eImg} else iiiiiii
ve(thisssva_ {
  buttone:empty')) {clsets} else iiiiiii_ {
  buttone:empty'range;
  nsdnge) {Ae);
 _ {
  target else iiiiiii false;_ {
  hide  prototde.f
ode(nohr, e.whics.n==l9 rHtml(childrer $el;
 ge.se l.s.ed 'pop

 r'nkrefresh} else iiier
 return}prototype.decorate ot }
   lclass^=.btn-aret, e')r
   clickfunction(e) {
        return false;
      };
    })(this)_ {
  _emtt, eImg} else iiiiir $el;
_ {
   l.s.ed 'pop

 r'nkrefresh} else iii}prototype.decorate ot }
   empty'
   vype chdOffdfunction(e) {
        return false;
      };
    })(this)ild[kge.sea   ve         iiiiir $el;
_ {
  refresh} else iiier
 return}prototype.decorate oti;
  };l= ['{ = tUpload r(, col};tManImag'Pop

 rn](_super) { = tUpload rhis._module;
    thicall$(ploadBtn, createInput$node.$(ploadBtn hi = ['tlclass^=.btn-upload'       hr,  {
    };

 (pload rhil;
        }
   $(ploadBtnc      } else iii  })(tove(th.  thicreateInput;
 utManager,         return false;
      };    })(this).edi_ {
  inputarHtml(childre_ {
  input.      } else iiiii
ode.find(r $el;
_ {
  input l;l('<input per)="filf" pit  ="d
  kge.sebte'(ploadImag'
 e(th" accept="imag'/*"   $node.rTo)$(ploadBtn         }prototype.decoelseimcreateInput( elseim = ['tlc
   click moirefownfun'input[per)=filf]function(e) {
        return false;
      };
    })(this) false;t.s)op= paaga   };  col, hi}prototype.decorate ot);
  };l= [' lc
   chdOff
un'input[per)=filf]function(e) {
        return false;
      };
    })(this) ge.se  };

 (pload rr(pload(_ {
  input,lHtml(childreinlin.:./>'),tml(childreimg:
_ {
  targettml(child} else iiiiir $el;
createInput( elseimii}prototype.decorate };tManImag'Pop

 rn](_super) {emtizeImghis._module; nputEpluonlySetVald;{ })(tcallheight, vype , width      hr, onlySetValhil;
        }
   onlySetValhivis));
    r}colotvype  
 inputEp vyp}  * 1      hr, !($.isNumeric(vype  o||Nvype  <lean';
        })(tove(th.  thihr, inputEp s, .is('widthElan';
      height 
  }
  height * vype  /t }
  widthelseimii }
  heightEl vyp}heightd;ode.f}ode(no{turn Fowidth 
  }
  width * vype  /t }
  height        .is('widthEl vyp}widthd; br, .find(.edi!onlySetVald;{ })(tot);
  };l= ['target$aen (Html(childwidth: width ||Nvype ,tml(childheight: height ||Nvype lseimii}d; br, .fin};tManImag'Pop

 rn](_super) {emtt, eImghis._module;
    thicalltize(noemopleMantize;
 u(tes);
 l= ['target$s.ed 'imag'-size'));!l;
   .?)     split(","d[:;void 0d[||N[.is('width,t }
  height]elseim = ['target$aen (Html(chiwidth: size[0].* 1,
(childheight: size[1].* 1
imii}d; br, .is('widthEl vyp}size[0]rate ot);
  };l= ['heightEl vyp}size[1]rate };tManImag'Pop

 rn](_super) showel;._module;
    thii++)$img,lgins col, args =l1a<=uginName == _this.?) {sliceuent[kginName =, 0d[:;[($node.Imag'Pop

 rnrguments);showutManager.plugins, colot$img 
  {
  target; br, .is('width 
 $img.width()elseim }
  height 
 $img.height()      hr, $img.y] dRange.(ploadiOf' arHtml(chii thisege.sesrcEl vyp}ge.sebte'(ploadiOf' an](_p('dis    d'lu/>')d; br, }ode(no       il= ['srcEl vyp}$img$aen ('src' an](_p('dis    d'lueditod; br, co.is('widthEl vyp}.is('width else iii  })(t;l= ['heightEl vyp}l= ['heightd; br, .fin};tManructor.Imag'Pop

 r;fr,
 Pop

 r)or.Saret.lenToolbarnaddButton Imag'Button){}.hasOIndme Button 
__extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || functor.Indme Button;
 utManager, _super);

  function Indme Button ) {
    return InputMaIndme Buttone__.constructor.Indme Buttonnrguments);
  }

  InputManager.pluginName = 'InputManIndme Buttonn](_super) +er.pro'indme 'dule)Indme Buttonn](_super) iconel;'indme 'dule)Indme Buttonn](_super) { = this._module;
    thi {
  tit   
  {
  bte {
  +er., (th (Tab)';constructor.Indme Buttonnrguments);{ = tuent[ker.p elseodule)Indme Buttonn](_super) sfst
 el;._module;$;tr,    })(t= thisv/>').appodule)Indme Buttonn](_super) pemma  el;._module;arHtml(c);
  };l= ['  };

 (nodeindme (, col};tManructor.Indme Button;fr,
 Button)or.Saret.lenToolbarnaddButton Indme Button){}.hasOOutdme Button 
__extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || functor.Outdme Button;
 utManager, _super);

  function Outdme Button ) {
    return InputMaOutdme Button;arHtml(c);
  };Outdme Buttonnrguments);
  }

  InputManager.pluginName = 'InputManOutdme Buttonn](_super) +er.pro'outdme 'dule)Outdme Buttonn](_super) iconel;'outdme 'dule)Outdme Buttonn](_super) { = this._module;
    thi {
  tit   
  {
  bte {
  +er., (th (Shift (tTab)';constructor.Outdme Buttonnrguments);{ = tuent[ker.p elseodule)Outdme Buttonn](_super) sfst
 el;._module;$;tr,    })(t= thisv/>').appodule)Outdme Buttonn](_super) pemma  el;._module;arHtml(c);
  };l= ['  };

 (nodeoutdme (, col};tManructor.Outdme Button;fr,
 Button)or.Saret.lenToolbarnaddButton Outdme Button){}.hasOHrButton 
__extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || functor.HrButton;
 utManager, _super);

  function HrButton ) {
    return InputMaHrButton;arHtml(c);
  };HrButtonnrguments);
  }

  InputManager.pluginName = 'InputManHrButtonn](_super) +er.pro'hr'dule)HrButtonn](_super) iconel;'minus'dule)HrButtonn](_super) e.auTagel;'hr'dule)HrButtonn](_super) sfst
 el;._module;$;tr,    })(t= thisv/>').appodule)HrButtonn](_super) pemma  el;._module;arHtml(ccall$hr, $t.p var lu$nunc var lu$rooc var  colot$rooc var his._seltStart((nodefurth    var $et       $nunc var  
 $rooc var enunc )      hr, $nunc var   _this.clea   })(t  ge.se  };

 range;
  nsa  } else i}ode(no       i$t.p var  hil('<p    $node.re._seltStart((nodephBr ; br, .find($hr hil('<hr    ..clearse);
 $rooc var )      hr, $nup var )o       i$t.p var ..clearse);
 $hrd; br, co.is('  };

 range;
  nsdnge) {A e) &&Of($nuw var )      }ode(no       il= ['tStart(range;
  namtt, e  protot.find(e', [$ege.se  };

 eturn $.tvype chdOffd
, colodule)ructor.HrButton;fr,
 Button)or.Saret.lenToolbarnaddButton HrButton){}.hasOT    Button 
__extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || functor.T    Button;
 utManager, _super);

  function T    Button ) {
    return InputMaT    Button;arHtml(c);
  };T    Buttonnrguments);
  }

  InputManager.pluginName = 'InputManT    Buttonn](_super) +er.pro'      ;tManT    Buttonn](_super) iconel;'      ;tManT    Buttonn](_super) e.auTagel;'      ;tManT    Buttonn](_super) dis    Tagel;'pre, liOfbvar quot  ;tManT    Buttonn](_super) ameuoiv/>').aManT    Buttonn](_super) { = this._module;
    thiT    Buttonnrguments);{ = tuent[ker.p else i$ amrgee._seltStart(formattti _nt[owedTagplu['t)) {
un'tr
un'td'lu'colgroup
un'col'rt  })(t$.unctioe._seltStart(formattti _nt[owedAen ibutes,lHtml(chitd:u['rowspan
un'colspan
],
(childcol:u['width']
imii}d; br, .is('{ = tShortcudp(oelse i }
   empty'
   decoratf
unction(e) {
        return false;
      };
lu$t      }
     r $el;
$tlclass^=      )=r $no        $el               iiiiir $el;
_ {
  decoratf($(      )ormatteret
, col, hi}prototype.decorate  i }
   empty'
   undecoratf
unction(e) {
        return false;
      };
lu$t      }
     r $el;
$tlclass^=      )=r $no        $el               iiiiir $el;
_ {
  undecoratf($(      )ormatteret
, col, hi}prototype.decorate  i }
   empty'
   sange;
  chdOffd.      unction(e) {
        return false;
      };
    })(this)i++)$cn fainti,l=dOffelse iiiiikge.se:empty')) {class^=.saret.le-     itd' c      dRange.a   ve
, col, hiotrf (this_ }
    };

 range;
  ngdnge) {(t  })(t thi.edirf (thil;
        }
   turn false col, isss
ode.finrn$rn fainti 
 $(;
    pemmonAncret, Cn fainti)  })(t thi.edirf (t pellapsedee, arn fainties, '.saret.le-     ' arHtml(chi  vaild[kge.se:empty'range;
  nae) {A e) &&Of($rn faintian';
        turn$rn fainti 
 $rn faintielass^= d:firstf else iiiiiii
ode(no{turn Fooooo  $rn fainti 
 $rn faintielass^= d:Rantf else iiiiiii
lse iiiiiii_ }
    };

 range;
  nsdnge) {A EndOf($cn fainti)  })(t thi
ode.find(r $el;
$rn faintie       ('td'lukge.se:empty')) {d$ndddRange.a   ve
, col, hi}prototype.decorate  i }
   empty'
   blue.      unction(e) {
        return false;
      };
    })(this)r $el;
_ {
    };

 )) {class^=.saret.le-     itd' c      dRange.a   ve
, col, hi}prototype.decorate  i }
   empty'inputManag'r nddKey}

okeHa  l $.t38
un'td'luction(e) {
        return false;
      };
lu$;tr,    })(ttttti++)$](evTr, $tr, iid x  })(t thi$tr 
 $ddrespy]; }('tr
, col, isss$](evTr 
 $trn](ev('tr
, col, issshr, !($](evTr= _this.clean';
        tu  })(tv/>').appen thi
ode.find(iid x 
 $trnlass^= d  ..cd x($;tr, $node.iiii_ }
    };

 range;
  nsdnge) {A EndOf($](evTr=lass^= d  .eq(.cd xd,;ode.find(r $el;
/>').appen t}prototype.decorate ot);
  };l= ['  };

 inputManag'r nddKey}

okeHa  l $.t40
un'td'luction(e) {
        return false;
      };
lu$;tr,    })(ttttti++)$nuncTr, $tr, iid x  })(t thi$tr 
 $ddrespy]; }('tr
, col, isss$nuncTr 
 $trnnunc 'tr
, col, issshr, !($nuncTr= _this.clean';
        tu  })(tv/>').appen thi
ode.find(iid x 
 $trnlass^= d  ..cd x($;tr, $node.iiii_ }
    };

 range;
  nsdnge) {A EndOf($nuncTr=lass^= d  .eq(.cd xd,;ode.find(r $el;
/>').appen t}prototype.decorate };tManT    Buttonn](_super) i= tRetize;
 ._module;$             i++)$cnlgrouplu$retizeHa  l lu$wnodent  })(t$wnodent 
 $t    spy]; }('.saret.le-     '   })(t$cnlgroup 
 $t    slass^=colgroup
)      hr, $colgroup  _this.<l1arHtml(chi$cnlgroup 
 $('<cnlgroup    .](ede.rTo)$      .appen t$t    slass^=tr:firstitd' cr $noction(e) {
        returnrn false;
      };el  d    })(t  vavai++)$cnl;
        tu  })(tv$cnl 
 $('<cnl/   $node.rTo)$cnlgroup prototde.f
ormatterype.decorate ot i }
  refreshT    Width($      .appen.find($retizeHa  l  
 $(' = c cRang="saret.le-retize-hdOdlf" ln find  };    ="edito"></= c>'  node.rTo)$$nodent else i$$nodent o   moire    
un'td'luction(e) {
        return false;
      };
    })(this)i++)$cnl, $td, iid x, x(noemo(noemo1 col, issshr, $$nodent y] dRange.retiziOf' arHtml(chi  va  })(tove(thisss
ode.find($td 
 $(e'cur {
 Targetd;ode.find(x 
  spygeX - $(e'cur {
 Targetd.offset} .lef} col, issshr, x.<l5ee, atdn](ev()  _this.clea   })(t  ind($td 
 $tdn](ev().appen thi
ode.find(ir, $tdnnunc 'td'   _this.<l1arHtml(childre$retizeHa  l  hide  prototde.fin  })(tove(thisss
ode.find(.edi(tes);
 $retizeHa  l  s.ed 'td' );!l;
   .?)     s, $ d  :;void 0d[Html(childre$retizeHa  l  show(,elseimiihiin  })(tove(thisss
ode.find(.id x 
 $td.py]; }() lass^= d  ..cd x($ d  col, isss$cnl 
 $colgroup lass^=col  .eq(.cd xd;ode.find(.edi(tes)1;
 $retizeHa  l  s.ed 'col  );!l;
   .?)    1 s, $col  :;void 0d[Html(childre$retizeHa  l  show(,elseimiihiin  })(tove(thisss
ode.find(  })(tv$retizeHa  l  cnge.lef}', $td.posidule;
.lef} + $td.outerWidth() - 5) s.ed 'td', $td) s.ed 'col , $col).show(,elseimii}prototype.decorate ot$$nodent o   moireleav  unction(e) {
        return false;
      };
    })(this)r $el;
$retizeHa  l  hide  prototde}prototype.decorate ot);
  };$$nodent o   moirefownfun'.saret.le-retize-hdOdlf'luction(e) {
        return false;
      };
    })(this)i++)$ha  l lu$lef}Cnl, $lef}Tdlu$rightCnl, $rightTdluminWidth,ts) &&Ha  l Lef},ts) &&Lef}Width,ts) &&RightWidth,ts) &&Xl      Widthove(thisss$ha  l  
 $(e'cur {
 Targetd;ode.find($lef}Td 
 $ha  l  s.ed 'td' ;ode.find($lef}Cnl 
 $ha  l  s.ed 'col  ;ode.find($rightTd 
 $lef}Tdnnunc 'td' ;ode.find($rightCnl 
 $lef}Cnlnnunc 'col  ;ode.find(s) &&X 
  spygeX;ode.find(s) &&Lef}Width 
 $lef}TdnouterWidth() * 1      ind(s) &&RightWidth;
 $rightTdnouterWidth() * 1      ind(s) &&Ha  l Lef}},
  _seFloat($ha  l  cnge.lef}'d,;ode.find(     Width 
 $lef}Tdn       ('t     )=width()elseimmmmmminWidth 
 50;ode.find($(.setStar) o   moire    .saret.le-retize-      un
      };earHtml(chi  vai++)deltaXl lef}Width,trightWidthelseimiihiindeltaX 
  spygeX - s) &&Xelseimiihiinlef}Width 
 s) &&Lef}Width +ndeltaXelseimiihiin ightWidth;
 s) &&RightWidth;-ndeltaXelseimiihiin    lef}Width <mminWidthn';
        turnlef}Width 
 minWidth;
        turndeltaX 
 minWidth - s) &&Lef}Width;
        turn ightWidth;
 s) &&RightWidth;-ndeltaXelseimiihiin
ode(nohr,  ightWidth;<mminWidthn';
        turn ightWidth;
 minWidth;
        turndeltaX 
 s) &&RightWidth;-nminWidth;
        turnlef}Width 
 s) &&Lef}Width +ndeltaXelseimiihiin
lse iiiiiii$lef}Cnlnaen ('width',  lef}Width /(     Width * 100) (th%
,ormatterets)$rightCnlnaen ('width',   ightWidth;/(     Width * 100) (th%
,ormatterets));
  };$ha  l  cnge.lef}',ts) &&Ha  l Lef} +ndeltaX)ormatteret
, col, hid($(.setStar) o e  moireup.saret.le-retize-      un
      };earHtml(chi  va$(.setStar) off('.saret.le-retize-     '   })(terets));
  };$$nodent $el.fidRange.retiziOf' ormatteret
, col, hid($$nodent ndddRange.retiziOf' ormatteret false;
s));
    rhi}prototype.decorate };tManT    Buttonn](_super) { = tShortcudphis._module;
    thi {
    };

 inputManag'r nddShortcud 'ctrl+alt+up
unction(e) {
        return false;
      };
    })(this)_ }
    };Mmeuulass^=.ameu-item[s.ed-  _am=.clearRowAb.fi] )=click} else iiiiir $el;

s));
    rhi}prototype.decorate ot }
   empty'inputManag'r nddShortcud 'ctrl+alt+fownfunction(e) {
        return false;
      };
    })(this)_ }
    };Mmeuulass^=.ameu-item[s.ed-  _am=.clearRowBelow] )=click} else iiiiir $el;

s));
    rhi}prototype.decorate ot }
   empty'inputManag'r nddShortcud 'ctrl+alt+lef}',tction(e) {
        return false;
      };
    })(this)_ }
    };Mmeuulass^=.ameu-item[s.ed-  _am=.clearCnlLef}] )=click} else iiiiir $el;

s));
    rhi}prototype.decorate ot);
  };l= ['  };

 inputManag'r nddShortcud 'ctrl+alt+ ight',tction(e) {
        return false;
      };
    })(this)_ }
    };Mmeuulass^=.ameu-item[s.ed-  _am=.clearCnlRight] )=click} else iiiiir $el;

s));
    rhi}prototype.decorate };tManT    Buttonn](_super) decoratf;
 ._module;$             ir, $t    spy]; }('.saret.le-     '   _this.clea   })(t  ge.seundecoratf($      .appen.find($t    s$nod(' = c cRang="saret.le-t    "></= c>' ate ot }
  i= tRetize($      .appen false $t    spy]; }(rate };tManT    Buttonn](_super) undecoratf;
 ._module;$             ir, ! $t    spy]; }('.saret.le-     '   _this.clean';
        })(tove(th.  thi false $t    spy]; }(r$$eplaceWith($      .app};tManT    Buttonn](_super) __id rMmeuoivi_module;
    thi$("<= c cRang=\"ameu-create-     \">\n /= c>\n<= c cRang=\"ameu-  };-     \">\n  <ul>\n     li><a pabiid x=\"-1\" unrange;    =\"on\" cRang=\"ameu-item\" h   =\"javascript:;\" s.ed-  _am=\"dangteRow\"><span>"
  (._selbte'dangteRow'))
  " ( Ctrl
  Al} +n→ )</span></a></li>\n     li><a pabiid x=\"-1\" unrange;    =\"on\" cRang=\"ameu-item\" h   =\"javascript:;\" s.ed-  _am=\".clearRowAb.fi\"><span>"
  (._selbte'.clearRowAb.fi'))
  " ( Ctrl
  Al} +n↑ )</span></a></li>\n     li><a pabiid x=\"-1\" unrange;    =\"on\" cRang=\"ameu-item\" h   =\"javascript:;\" s.ed-  _am=\".clearRowBelow\"><span>"
  (._selbte'.clearRowBelow'))
  " ( Ctrl
  Al} +n↓ )</span></a></li>\n     li><span cRang=\"se  _a.le\"></span></li>\n     li><a pabiid x=\"-1\" unrange;    =\"on\" cRang=\"ameu-item\" h   =\"javascript:;\" s.ed-  _am=\"dangteCnl\"><span>"
  (._selbte'dangteCnlumn'))
  "</span></a></li>\n     li><a pabiid x=\"-1\" unrange;    =\"on\" cRang=\"ameu-item\" h   =\"javascript:;\" s.ed-  _am=\".clearCnlLef}\"><span>"
  (._selbte'.clearCnlumnLef}'d,
  " ( Ctrl
  Al} +n← )</span></a></li>\n     li><a pabiid x=\"-1\" unrange;    =\"on\" cRang=\"ameu-item\" h   =\"javascript:;\" s.ed-  _am=\".clearCnlRight\"><span>"
  (._selbte'.clearCnlumnRight' )
  " ( Ctrl
  Al} +n→ )</span></a></li>\n     li><span cRang=\"se  _a.le\"></span></li>\n     li><a pabiid x=\"-1\" unrange;    =\"on\" cRang=\"ameu-item\" h   =\"javascript:;\" s.ed-  _am=\"dangteT    \"><span>"
  (._selbte'dangteT    ' ar  "</span></a></li>\n  </ul>\n</= c>" $node.rTo) }
  ameuWnodent else iototypreateMmeuoiv }
  ameuWnodentulass^=.ameu-create-     'rate ot }
   empMmeuoiv }
  ameuWnodentulass^=.ameu-  };-     ' else iototypreateT    (6, 6 $node.rTo) }
  preateMmeu else iototypreateMmeu o   moireind r
un'td'luction(e) {
        return false;
      };
    })(this)i++)$td, $tr, num$node.iiii_ }
  preateMmeu lass^= d  .$el.fidRange.range;fd
, col, hiot$td 
 $(e'cur {
 Targetd;ode.find($tr 
 $td.py]; }();ode.find(num 
 $trnlass^= d  ..cd x($ d  + 1      ind( false $trn](evAll 'tr
,naddBack()elass^= d:Rte' + num (th)'d$ndddRange.range;fd
, col, hi}prototype.decorate ot }
  preateMmeu o   moireleav  unction(e) {
        return false;
      };
    })(this)r $el;
$(e'cur {
 Targetd.lass^= d  .$el.fidRange.range;fd
, col, hi}prototype.decorate ot);
  };l= ['preateMmeu o   moirefownfun'td'luction(e) {
        return false;
      };
    })(this)i++)$c       var , $t    ,)$td, $tr, colNum, rowNum$node.iiii_ }
  $nodent $el.fidRange.ameu-on
,ormatterhi.edi!_._seltStart(inputManag'r fsetsfd    })(t  vava  })(tove(thisss
ode.find($td 
 $(e'cur {
 Targetd;ode.find($tr 
 $td.py]; }();ode.find(colNum 
 $trnlass^= d  ..cd x($ d  + 1      ind( owNum 
 $trn](evAll 'tr
,n _this.+ 1      ind($t     
 _ {
  createT    ( owNum, colNum, />')d; br, coer$c       var his_ }
    };

 (node        var $et       erhi.edi_ }
    };

 (nodeisEmpty();
 $        var ,arHtml(childre$        var $$eplaceWith($      .appthisss
ode(no{turn Fooooo$        var $ae);
 $      .appthisss
node.iiii_ }
  decoratf($      .appeniiii_ }
    };

 range;
  nsdnge) {A e) &&Of($t    slass^=td:firstf  .appeniiii_ }
    };

 eturn $.tvype chdOffd
, col, hiotr $el;

s));
    rhi}prototype.decorate };tManT    Buttonn](_super) createT    oivi_module; ow, col, phBr        i++)$t    ,)$t)) {,)$td, $tr, c, r, _i, _j;find($t     
 $(' t    />' ate ot$t)) { 
 $(' t)) {/   $node.rTo)$      .appenProp.r 
 _i 
 0; 0a<=u ow.?) i <u ow.:) i >u ow; r 
 0a<=u ow.?)++ i : --_iarHtml(chi$tr hil('<tr/   $node.rTo)$ )) {d; br, coProp.c =l_j 
 0; 0a<=ucnl ?l_j <ucnl :l_j >ucnl; c 
 0a<=ucnl ?l++ j : --_jarHtml(child$td 
 $('<td/   $node.rTo)$ i)  })(t thi.ediphBr        (child$td$node.re._seltStart((nodephBr ; br, isss
node.ii}ve(th.  thi false $t    .app};tManT    Buttonn](_super) __freshT    Width;
 ._module;$             i++)colsl      Widthove(th     Width 
 $t    s$idth()elseimcols 
 $t    slass^=col' .appen false $t    slass^=tr:firstitd' cr $noction(e) {
        return false;
      };el  d    })(t  vai++)$cnl;
        $cnl 
 cols.eq(., col, hiotr $el;
$cnlnaen ('width',  $(td) outerWidth() /(     Width * 100) (th%
,ormatter}prototype.decorate };tManT    Buttonn](_super) sdnA   ve;
 ._module;a   ve        T    Buttonnrguments);sdnA   veuent[ker.p, a   ve ;     ir, a   ve         il= ['preateMmeu hide  prototde);
  };l= ['  };Mmeu show(,elseim}ode(no       il= ['preateMmeu show(,elseimii);
  };l= ['  };Mmeu hide  protot}te };tManT    Buttonn](_super) dangteRow;
 ._module;$ d        i++)$newTr, $tr, iid x  })(t$tr 
 $td.py]; }('tr
, col, ir, $t
 riblnag1 'tr
,n _this.<l1arHtml(chi);
  };l= ['dangteT    ($ d  col, }ode(no       i$t.pTr 
 $trnnunc 'tr
, col, ishr, !($nuwTr= _this.clean';
        $t.pTr 
 $trn](ev('tr
, col, is
node.iiiid x 
 $trnlass^= d  ..cd x($ d  col, is$trn      } else iii  })(to.is('  };

 range;
  nsdnge) {A EndOf($nuwTr=lass^= d  .eq(.cd xd,;ode.f}te };tManT    Buttonn](_super) .clearRow;
 ._module;$ d, dirge;
          i++)$newTr, $t    ,)$tr, colNum, i, iid x, _i col, ir, dirge;
  hil;
        }
   dirge;
  hi 'ae);

;t    
ode.f$tr 
 $td.py]; }('tr
, col, $t     
 $trn       ('t     )elseimcolNum 
 0 col, $t    slass^=tr' cr $noction(e) {
        return false;
      };el  r    })(this)r $el;
colNum 
 Math.max(colNum, $(trd.lass^= d  . _this,elseimii}prototype.decorate ot$t.pTr 
 $('<tr/   .appenProp.i 
 _i 
 1;l1a<=ucolNum ?) i <=ucolNum :) i >=ucolNum; i 
 1a<=ucolNum ?)++ i : --_iarHtml(chi$('<td/   $node.re._seltStart((nodephBr .node.rTo)$t.pTr .appen.find($tr[dirge;
  ])$t.pTr .appeniid x 
 $trnlass^= d  ..cd x($ d  col,   })(to.is('  };

 range;
  nsdnge) {A e) &&Of($nuwTr=lass^= d  .eq(.cd xd,;ode};tManT    Buttonn](_super) dangteCnl 
 ._module;$ d        i++)$newTd, $t    ,)$tr, iid x  })(t$tr 
 $td.py]; }('tr
, col, ir, $t
 riblnag1 'tr
,n _this.<l1ee, atdnriblnag1 'td'   _this.<l1arHtml(chi);
  };l= ['dangteT    ($ d  col, }ode(no       iiid x 
 $trnlass^= d  ..cd x($ d  col, is$newTd 
 $td.nunc 'td' ;ode.finhr, !($nuwTd= _this.clean';
        $t.pTd 
 $trn](ev('td
, col, is
node.ii$t     
 $trn       ('t     )elseim  $t    slass^=col' .eq(.cd xdn      } else iii$t    slass^=tr' cr $noction(e) {
        returnrn false;
      };el  r    })(this)s)r $el;
$(trd.lass^= d  .eq(.cd xdn      } else iii.f
ormatterype.decorate ot i }
  refreshT    Width($      .appenii  })(to.is('  };

 range;
  nsdnge) {A EndOf($nuwTd,;ode.f}te };tManT    Buttonn](_super) .clearCnl 
 ._module;$ d, dirge;
          i++)$cnl, $nuwCnl, $nuwTd, $t    ,)$tr, iid xl      Width, width      hr, dirge;
  hil;
        }
   dirge;
  hi 'ae);

;t    
ode.f$tr 
 $td.py]; }('tr
, col, iid x 
 $trnlass^= d  ..cd x($ d  col, $t     
 $tdn       ('t     ) col, $cnl 
 $t    slass^=col' .eq(.cd xd col, $t    slass^=tr' cr $noction(e) {
        return false;
      };el  r    })(this)i++)$newTd;
        $t.pTd 
 $('<td/   $node.re_ }
    };

 (nodephBr ; br, isssr $el;
$(trd.lass^= d  .eq(.cd xd[dirge;
  ])$t.pTd,elseimii}prototype.decorate ot$t.pCnl 
 $('<cnl/    col, $cnl[dirge;
  ])$t.pCnlrate ot     Width 
 $t    s$idth()elseimwidth 
 Math.max(  _seFloat($cnlnaen ('width')) /(2, 50 /(     Width * 100) col, $cnlnaen ('width', width + '%
,ormatt$t.pCnlnaen ('width', width + '%
,ormatt }
  refreshT    Width($      .appen$t.pTd 
 dirge;
  hili 'ae);

 ?)$td.nunc 'td'  : $tdn](ev('td
, col,   })(to.is('  };

 range;
  nsdnge) {A e) &&Of($nuwTd,;ode};tManT    Buttonn](_super) dangteT    oivi_module;$ d        i++)$bvar , $t     col, $t     
 $tdn       ('.saret.le-     '   })(t$bvar  hilt    snunc 'p'       lt    s      } else ihr, $bvar e _this.clea   })(t    })(to.is('  };

 range;
  nsdnge) {A e) &&Of($bvar d;ode.f}te };tManT    Buttonn](_super) cemma  el;._module;  _am        i++)$td,l=dOffelse ief (this._seltStart(range;
  ngdnge) {(t  })(t$td 
 $(;
    pemmonAncret, Cn fainti)e       ('td' else ihr, ! $tdn _this.clean';
        })(tove(th.  thi.edip _amhili 'dangteRow')o       il= ['dangteRow($ d  col, }ode(no.edip _amhili '.clearRowAb.fi')o       il= ['.clearRow;$ d, 'bef, e') col, }ode(no.edip _amhili '.clearRowBelow')o       il= ['.clearRow;$ d) col, }ode(no.edip _amhili 'dangteCnl')o       il= ['dangteCnl($ d  col, }ode(no.edip _amhili '.clearCnlLef}')o       il= ['.clearCnl($ d, 'bef, e') col, }ode(no.edip _amhili '.clearCnlRight')o       il= ['.clearCnl($ d) col, }ode(no.edip _amhili 'dangteT    ' o       il= ['dangteT    ($ d  col, }ode(no       i  })(tove(th.  thi false ge.se  };

 eturn $.tvype chdOffd
, colodule)ructor.T    Button;fr,
 Button)or.Saret.lenToolbarnaddButton T    Button){}.hasOSetukethroughButton 
__extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || functor.SetukethroughButton;
 utManager, _super);

  function SetukethroughButton ) {
    return InputMaSetukethroughButton;arHtml(c);
  };SetukethroughButtonnrguments);
  }

  InputManager.pluginName = 'InputManSetukethroughButtonn](_super) +er.pro'setukethrough ;tManSetukethroughButtonn](_super) iconel;'setukethrough ;tManSetukethroughButtonn](_super) e.auTagel;'setuke ;tManSetukethroughButtonn](_super) dis    Tagel;'pre ;tManSetukethroughButtonn](_super) sfst
 el;._module;$;tr,    })(tcalla   veelse ihr, $ode);!l;
        }
    = ['setDis    d($ddress, .is('dis    Tag d; br, .find(.edi {
  dis    darHtml(chi= thisv/>').appendatt la   ve 
 dsetStar.queryCemma  e) te('setukethrough )hili />').appen = ['setA   ve(a   ve ;     = thisva   veelse};tManSetukethroughButtonn](_super) pemma  el;._module;arHtml(cdsetStar.execCemma  ('setukethrough ).appen = ['  };

 eturn $.tvype chdOffd
, col, r $el;
$(.setStar) eturn $.tsange;
  chdOff
, colodule)ructor.SetukethroughButton;fr,
 Button)or.Saret.lenToolbarnaddButton SetukethroughButton)or.ructor.Saret.le;fr,
)or