// Released under MIT license
// Copyright (c) 2009-2010 Dominic Baggott
// Copyright (c) 2009-2010 Ash Berlin
// Copyright (c) 2011 Christoph Dorn <christoph@christophdorn.com> (http://www.christophdorn.com)

(function( expose ) {

/**
 *  class Markdown
 *
 *  Markdown processing in Javascript done right. We have very particular views
 *  on what constitutes 'right' which include:
 *
 *  - produces well-formed HTML (this means that em and strong nesting is
 *    important)
 *
 *  - has an intermediate representation to allow processing of parsed data (We
 *    in fact have two, both as [JsonML]: a markdown tree and an HTML tree).
 *
 *  - is easily extensible to add new dialects without having to rewrite the
 *    entire parsing mechanics
 *
 *  - has a good test suite
 *
 *  This implementation fulfills all of these (except that the test suite could
 *  do with expanding to automatically run all the fixtures from other Markdown
 *  implementations.)
 *
 *  ##### Intermediate Representation
 *
 *  *TODO* Talk about this :) Its JsonML, but document the node names we use.
 *
 *  [JsonML]: http://jsonml.org/ "JSON Markup Language"
 **/
var Markdown = expose.Markdown = function Markdown(dialect) {
  switch (typeof dialect) {
    case "undefined":
      this.dialect = Markdown.dialects.Gruber;
      break;
    case "object":
      this.dialect = dialect;
      break;
    default:
      if (dialect in Markdown.dialects) {
        this.dialect = Markdown.dialects[dialect];
      }
      else {
        throw new Error("Unknown Markdown dialect '" + String(dialect) + "'");
      }
      break;
  }
  this.em_state = [];
  this.strong_state = [];
  this.debug_indent = "";
};

/**
 *  parse( markdown, [dialect] ) -> JsonML
 *  - markdown (String): markdown string to parse
 *  - dialect (String | Dialect): the dialect to use, defaults to gruber
 *
 *  Parse `markdown` and return a markdown document as a Markdown.JsonML tree.
 **/
expose.parse = function( source, dialect ) {
  // dialect will default if undefined
  var md = new Markdown( dialect );
  return md.toTree( source );
};

/**
 *  toHTML( markdown, [dialect]  ) -> String
 *  toHTML( md_tree ) -> String
 *  - markdown (String): markdown string to parse
 *  - md_tree (Markdown.JsonML): parsed markdown tree
 *
 *  Take markdown (either as a string or as a JsonML tree) and run it through
 *  [[toHTMLTree]] then turn it into a well-formated HTML fragment.
 **/
expose.toHTML = function toHTML( source , dialect , options ) {
  var input = expose.toHTMLTree( source , dialect , options );

  return expose.renderJsonML( input );
};

/**
 *  toHTMLTree( markdown, [dialect] ) -> JsonML
 *  toHTMLTree( md_tree ) -> JsonML
 *  - markdown (String): markdown string to parse
 *  - dialect (String | Dialect): the dialect to use, defaults to gruber
 *  - md_tree (Markdown.JsonML): parsed markdown tree
 *
 *  Turn markdown into HTML, represented as a JsonML tree. If a string is given
 *  to this function, it is first parsed into a markdown tree by calling
 *  [[parse]].
 **/
expose.toHTMLTree = function toHTMLTree( input, dialect , options ) {
  // convert string input to an MD tree
  if ( typeof input ==="string" ) input = this.parse( input, dialect );

  // Now convert the MD tree to an HTML tree

  // remove references from the tree
  var attrs = extract_attr( input ),
      refs = {};

  if ( attrs && attrs.references ) {
    refs = attrs.references;
  }

  var html = convert_tree_to_html( input, refs , options );
  merge_text_nodes( html );
  return html;
};

// For Spidermonkey based engines
function mk_block_toSource() {
  return "Markdown.mk_block( " +
          uneval(this.toString()) +
          ", " +
          uneval(this.trailing) +
          ", " +
          uneval(this.lineNumber) +
          " )";
}

// node
function mk_block_inspect() {
  var util = require('util');
  return "Markdown.mk_block( " +
          util.inspect(this.toString()) +
          ", " +
          util.inspect(this.trailing) +
          ", " +
          util.inspect(this.lineNumber) +
          " )";

}

var mk_block = Markdown.mk_block = function(block, trail, line) {
  // Be helpful for default case in tests.
  if ( arguments.length == 1 ) trail = "\n\n";

  var s = new String(block);
  s.trailing = trail;
  // To make it clear its not just a string
  s.inspect = mk_block_inspect;
  s.toSource = mk_block_toSource;

  if (line != undefined)
    s.lineNumber = line;

  return s;
};

function count_lines( str ) {
  var n = 0, i = -1;
  while ( ( i = str.indexOf('\n', i+1) ) !== -1) n++;
  return n;
}

// Internal - split source into rough blocks
Markdown.prototype.split_blocks = function splitBlocks( input, startLine ) {
  // [\s\S] matches _anything_ (newline or space)
  var re = /([\s\S]+?)($|\n(?:\s*\n|$)+)/g,
      blocks = [],
      m;

  var line_no = 1;

  if ( ( m = /^(\s*\n)/.exec(input) ) != null ) {
    // skip (but count) leading blank lines
    line_no += count_lines( m[0] );
    re.lastIndex = m[0].length;
  }

  while ( ( m = re.exec(input) ) !== null ) {
    blocks.push( mk_block( m[1], m[2], line_no ) );
    line_no += count_lines( m[0] );
  }

  return blocks;
};

/**
 *  Markdown#processBlock( block, next ) -> undefined | [ JsonML, ... ]
 *  - block (String): the block to process
 *  - next (Array): the following blocks
 *
 * Process `block` and return an array of JsonML nodes representing `block`.
 *
 * It does this by asking each block level function in the dialect to process
 * the block until one can. Succesful handling is indicated by returning an
 * array (with zero or more JsonML nodes), failure by a false value.
 *
 * Blocks handlers are responsible for calling [[Markdown#processInline]]
 * themselves as appropriate.
 *
 * If the blocks were split incorrectly or adjacent blocks need collapsing you
 * can adjust `next` in place using shift/splice etc.
 *
 * If any of this default behaviour is not right for the dialect, you can
 * define a `__call__` method on the dialect that will get invoked to handle
 * the block processing.
 */
Markdown.prototype.processBlock = function processBlock( block, next ) {
  var cbs = this.dialect.block,
      ord = cbs.__order__;

  if ( "__call__" in cbs ) {
    return cbs.__call__.call(this, block, next);
  }

  for ( var i = 0; i < ord.length; i++ ) {
    //D:this.debug( "Testing", ord[i] );
    var res = cbs[ ord[i] ].call( this, block, next );
    if ( res ) {
      //D:this.debug("  matched");
      if ( !isArray(res) || ( res.length > 0 && !( isArray(res[0]) ) ) )
        this.debug(ord[i], "didn't return a proper array");
      //D:this.debug( "" );
      return res;
    }
  }

  // Uhoh! no match! Should we throw an error?
  return [];
};

Markdown.prototype.processInline = function processInline( block ) {
  return this.dialect.inline.__call__.call( this, String( block ) );
};

/**
 *  Markdown#toTree( source ) -> JsonML
 *  - source (String): markdown source to parse
 *
 *  Parse `source` into a JsonML tree representing the markdown document.
 **/
// custom_tree means set this.tree to `custom_tree` and restore old value on return
Markdown.prototype.toTree = function toTree( source, custom_root ) {
  var blocks = source instanceof Array ? source : this.split_blocks( source );

  // Make tree a member variable so its easier to mess with in extensions
  var old_tree = this.tree;
  try {
    this.tree = custom_root || this.tree || [ "markdown" ];

    blocks:
    while ( blocks.length ) {
      var b = this.processBlock( blocks.shift(), blocks );

      // Reference blocks and the like won't return any content
      if ( !b.length ) continue blocks;

      this.tree.push.apply( this.tree, b );
    }
    return this.tree;
  }
  finally {
    if ( custom_root ) {
      this.tree = old_tree;
    }
  }
};

// Noop by default
Markdown.prototype.debug = function () {
  var args = Array.prototype.slice.call( arguments);
  args.unshift(this.debug_indent);
  if (typeof print !== "undefined")
      print.apply( print, args );
  if (typeof console !== "undefined" && typeof console.log !== "undefined")
      console.log.apply( null, args );
}

Markdown.prototype.loop_re_over_block = function( re, block, cb ) {
  // Dont use /g regexps with this
  var m,
      b = block.valueOf();

  while ( b.length && (m = re.exec(b) ) != null) {
    b = b.substr( m[0].length );
    cb.call(this, m);
  }
  return b;
};

/**
 * Markdown.dialects
 *
 * Namespace of built-in dialects.
 **/
Markdown.dialects = {};

/**
 * Markdown.dialects.Gruber
 *
 * The default dialect that follows the rules set out by John Gruber's
 * markdown.pl as closely as possible. Well actually we follow the behaviour of
 * that script which in some places is not exactly what the syntax web page
 * says.
 **/
Markdown.dialects.Gruber = {
  block: {
    atxHeader: function atxHeader( block, next ) {
      var m = block.match( /^(#{1,6})\s*(.*?)\s*#*\s*(?:\n|$)/ );

      if ( !m ) return undefined;

      var header = [ "header", { level: m[ 1 ].length } ];
      Array.prototype.push.apply(header, this.processInline(m[ 2 ]));

      if ( m[0].length < block.length )
        next.unshift( mk_block( block.substr( m[0].length ), block.trailing, block.lineNumber + 2 ) );

      return [ header ];
    },

    setextHeader: function setextHeader( block, next ) {
      var m = block.match( /^(.*)\n([-=])\2\2+(?:\n|$)/ );

      if ( !m ) return undefined;

      var level = ( m[ 2 ] === "=" ) ? 1 : 2;
      var header = [ "header", { level : level }, m[ 1 ] ];

      if ( m[0].length < block.length )
        next.unshift( mk_block( block.substr( m[0].length ), block.trailing, block.lineNumber + 2 ) );

      return [ header ];
    },

    code: function code( block, next ) {
      // |    Foo
      // |bar
      // should be a code block followed by a paragraph. Fun
      //
      // There might also be adjacent code block to merge.

      var ret = [],
          re = /^(?: {0,3}\t| {4})(.*)\n?/,
          lines;

      // 4 spaces + content
      if ( !block.match( re ) ) return undefined;

      block_search:
      do {
        // Now pull out the rest of the lines
        var b = this.loop_re_over_block(
                  re, block.valueOf(), function( m ) { ret.push( m[1] ); } );

        if (b.length) {
          // Case alluded to in first comment. push it back on as a new block
          next.unshift( mk_block(b, block.trailing) );
          break block_search;
        }
        else if (next.length) {
          // Check the next block - it might be code too
          if ( !next[0].match( re ) ) break block_search;

          // Pull how how many blanks lines follow - minus two to account for .join
          ret.push ( block.trailing.replace(/[^\n]/g, '').substring(2) );

          block = next.shift();
        }
        else {
          break block_search;
        }
      } while (true);

      return [ [ "code_block", ret.join("\n") ] ];
    },

    horizRule: function horizRule( block, next ) {
      // this needs to find any hr in the block to handle abutting blocks
      var m = block.match( /^(?:([\s\S]*?)\n)?[ \t]*([-_*])(?:[ \t]*\2){2,}[ \t]*(?:\n([\s\S]*))?$/ );

      if ( !m ) {
        return undefined;
      }

      var jsonml = [ [ "hr" ] ];

      // if there's a leading abutting block, process it
      if ( m[ 1 ] ) {
        jsonml.unshift.apply( jsonml, this.processBlock( m[ 1 ], [] ) );
      }

      // if there's a trailing abutting block, stick it into next
      if ( m[ 3 ] ) {
        next.unshift( mk_block( m[ 3 ] ) );
      }

      return jsonml;
    },

    // There are two types of lists. Tight and loose. Tight lists have no whitespace
    // between the items (and result in text just in the <li>) and loose lists,
    // which have an empty line between list items, resulting in (one or more)
    // paragraphs inside the <li>.
    //
    // There are all sorts weird edge cases about the original markdown.pl's
    // handling of lists:
    //
    // * Nested lists are supposed to be indented by four chars per level. But
    //   if they aren't, you can get a nested list by indenting by less than
    //   four so long as the indent doesn't match an indent of an existing list
    //   item in the 'nest stack'.
    //
    // * The type of the list (bullet or number) is controlled just by the
    //    first item at the indent. Subsequent changes are ignored unless they
    //    are for nested lists
    //
    lists: (function( ) {
      // Use a closure to hide a few variables.
      var any_list = "[*+-]|\\d+\\.",
          bullet_list = /[*+-]/,
          number_list = /\d+\./,
          // Capture leading indent as it matters for determining nested lists.
          is_list_re = new RegExp( "^( {0,3})(" + any_list + ")[ \t]+" ),
          indent_re = "(?: {0,3}\\t| {4})";

      // TODO: Cache this regexp for certain depths.
      // Create a regexp suitable for matching an li for a given stack depth
      function regex_for_depth( depth ) {

        return new RegExp(
          // m[1] = indent, m[2] = list_type
          "(?:^(" + indent_re + "{0," + depth + "} {0,3})(" + any_list + ")\\s+)|" +
          // m[3] = cont
          "(^" + indent_re + "{0," + (depth-1) + "}[ ]{0,4})"
        );
      }
      function expand_tab( input ) {
        return input.replace( / {0,3}\t/g, "    " );
      }

      // Add inline content `inline` to `li`. inline comes from processInline
      // so is an array of content
      function add(li, loose, inline, nl) {
        if (loose) {
          li.push( [ "para" ].concat(inline) );
          return;
        }
        // Hmmm, should this be any block level element or just paras?
        var add_to = li[li.length -1] instanceof Array && li[li.length - 1][0] == "para"
                   ? li[li.length -1]
                   : li;

        // If there is already some content in this list, add the new line in
        if (nl && li.length > 1) inline.unshift(nl);

        for (var i=0; i < inline.length; i++) {
          var what = inline[i],
              is_str = typeof what == "string";
          if (is_str && add_to.length > 1 && typeof add_to[add_to.length-1] == "string" ) {
            add_to[ add_to.length-1 ] += what;
          }
          else {
            add_to.push( what );
          }
        }
      }

      // contained means have an indent greater than the current one. On
      // *every* line in the block
      function get_contained_blocks( depth, blocks ) {

        var re = new RegExp( "^(" + indent_re + "{" + depth + "}.*?\\n?)*$" ),
            replace = new RegExp("^" + indent_re + "{" + depth + "}", "gm"),
            ret = [];

        while ( blocks.length > 0 ) {
          if ( re.exec( blocks[0] ) ) {
            var b = blocks.shift(),
                // Now remove that indent
                x = b.replace( replace, "");

            ret.push( mk_block( x, b.trailing, b.lineNumber ) );
          }
          break;
        }
        return ret;
      }

      // passed to stack.forEach to turn list items up the stack into paras
      function paragraphify(s, i, stack) {
        var list = s.list;
        var last_li = list[list.length-1];

        if (last_li[1] instanceof Array && last_li[1][0] == "para") {
          return;
        }
        if (i+1 == stack.length) {
          // Last stack frame
          // Keep the same array, but replace the contents
          last_li.push( ["para"].concat( last_li.splice(1) ) );
        }
        else {
          var sublist = last_li.pop();
          last_li.push( ["para"].concat( last_li.splice(1) ), sublist );
        }
      }

      // The matcher function
      return function( block, next ) {
        var m = block.match( is_list_re );
        if ( !m ) return undefined;

        function make_list( m ) {
          var list = bullet_list.exec( m[2] )
                   ? ["bulletlist"]
                   : ["numberlist"];

          stack.push( { list: list, indent: m[1] } );
          return list;
        }


        var stack = [], // Stack of lists for nesting.
            list = make_list( m ),
            last_li,
            loose = false,
            ret = [ stack[0].list ],
            i;

        // Loop to search over block looking for inner block elements and loose lists
        loose_search:
        while( true ) {
          // Split into lines preserving new lines at end of line
          var lines = block.split( /(?=\n)/ );

          // We have to grab all lines for a li and call processInline on them
          // once as there are some inline things that can span lines.
          var li_accumulate = "";

          // Loop over the lines in this block looking for tight lists.
          tight_search:
          for (var line_no=0; line_no < lines.length; line_no++) {
            var nl = "",
                l = lines[line_no].replace(/^\n/, function(n) { nl = n; return ""; });

            // TODO: really should cache this
            var line_re = regex_for_depth( stack.length );

            m = l.match( line_re );
            //print( "line:", uneval(l), "\nline match:", uneval(m) );

            // We have a list item
            if ( m[1] !== undefined ) {
              // Process the previous list item, if any
              if ( li_accumulate.length ) {
                add( last_li, loose, this.processInline( li_accumulate ), nl );
                // Loose mode will have been dealt with. Reset it
                loose = false;
                li_accumulate = "";
              }

              m[1] = expand_tab( m[1] );
              var wanted_depth = Math.floor(m[1].length/4)+1;
              //print( "want:", wanted_depth, "stack:", stack.length);
              if ( wanted_depth > stack.length ) {
                // Deep enough for a nested list outright
                //print ( "new nested list" );
                list = make_list( m );
                last_li.push( list );
                last_li = list[1] = [ "listitem" ];
              }
              else {
                // We aren't deep enough to be strictly a new level. This is
                // where Md.pl goes nuts. If the indent matches a level in the
                // stack, put it there, else put it one deeper then the
                // wanted_depth deserves.
                var found = false;
                for (i = 0; i < stack.length; i++) {
                  if ( stack[ i ].indent != m[1] ) continue;
                  list = stack[ i ].list;
                  stack.splice( i+1 );
                  found = true;
                  break;
                }

                if (!found) {
                  //print("not found. l:", uneval(l));
                  wanted_depth++;
                  if (wanted_depth <= stack.length) {
                    stack.splice(wanted_depth);
                    //print("Desired depth now", wanted_depth, "stack:", stack.length);
                    list = stack[wanted_depth-1].list;
                    //print("list:", uneval(list) );
                  }
                  else {
                    //print ("made new stack for messy indent");
                    list = make_list(m);
                    last_li.push(list);
                  }
                }

                //print( uneval(list), "last", list === stack[stack.length-1].list );
                last_li = [ "listitem" ];
                list.push(last_li);
              } // end depth of shenegains
              nl = "";
            }

            // Add content
            if (l.length > m[0].length) {
              li_accumulate += nl + l.substr( m[0].length );
            }
          } // tight_search

          if ( li_accumulate.length ) {
            add( last_li, loose, this.processInline( li_accumulate ), nl );
            // Loose mode will have been dealt with. Reset it
            loose = false;
            li_accumulate = "";
          }

          // Look at the next block - we might have a loose list. Or an extra
          // paragraph for the current li
          var contained = get_contained_blocks( stack.length, next );

          // Deal with code blocks or properly nested lists
          if (contained.length > 0) {
            // Make sure all listitems up the stack are paragraphs
            forEach( stack, paragraphify, this);

            last_li.push.apply( last_li, this.toTree( contained, [] ) );
          }

          var next_block = next[0] && next[0].valueOf() || "";

          if ( next_block.match(is_list_re) || next_block.match( /^ / ) ) {
            block = next.shift();

            // Check for an HR following a list: features/lists/hr_abutting
            var hr = this.dialect.block.horizRule( block, next );

            if (hr) {
              ret.push.apply(ret, hr);
              break;
            }

            // Make sure all listitems up the stack are paragraphs
            forEach( stack, paragraphify, this);

            loose = true;
            continue loose_search;
          }
          break;
        } // loose_search

        return ret;
      };
    })(),

    blockquote: function blockquote( block, next ) {
      if ( !block.match( /^>/m ) )
        return undefined;

      var jsonml = [];

      // separate out the leading abutting block, if any
      if ( block[ 0 ] != ">" ) {
        var lines = block.split( /\n/ ),
            prev = [];

        // keep shifting lines until you find a crotchet
        while ( lines.length && lines[ 0 ][ 0 ] != ">" ) {
            prev.push( lines.shift() );
        }

        // reassemble!
        block = lines.join( "\n" );
        jsonml.push.apply( jsonml, this.processBlock( prev.join( "\n" ), [] ) );
      }

      // if the next block is also a blockquote merge it in
      while ( next.length && next[ 0 ][ 0 ] == ">" ) {
        var b = next.shift();
        block = new String(block + block.trailing + b);
        block.trailing = b.trailing;
      }

      // Strip off the leading "> " and re-process as a block.
      var input = block.replace( /^> ?/gm, '' ),
          old_tree = this.tree;
      jsonml.push( this.toTree( input, [ "blockquote" ] ) );

      return jsonml;
    },

    referenceDefn: function referenceDefn( block, next) {
      var re = /^\s*\[(.*?)\]:\s*(\S+)(?:\s+(?:(['"])(.*?)\3|\((.*?)\)))?\n?/;
      // interesting matches are [ , ref_id, url, , title, title ]

      if ( !block.match(re) )
        return undefined;

      // make an attribute node if it doesn't exist
      if ( !extract_attr( this.tree ) ) {
        this.tree.splice( 1, 0, {} );
      }

      var attrs = extract_attr( this.tree );

      // make a references hash if it doesn't exist
      if ( attrs.references === undefined ) {
        attrs.references = {};
      }

      var b = this.loop_re_over_block(re, block, function( m ) {

        if ( m[2] && m[2][0] == '<' && m[2][m[2].length-1] == '>' )
          m[2] = m[2].substring( 1, m[2].length - 1 );

        var ref = attrs.references[ m[1].toLowerCase() ] = {
          href: m[2]
        };

        if (m[4] !== undefined)
          ref.title = m[4];
        else if (m[5] !== undefined)
          ref.title = m[5];

      } );

      if (b.length)
        next.unshift( mk_block( b, block.trailing ) );

      return [];
    },

    para: function para( block, next ) {
      // everything's a para!
      return [ ["para"].concat( this.processInline( block ) ) ];
    }
  }
};

Markdown.dialects.Gruber.inline = {

    __oneElement__: function oneElement( text, patterns_or_re, previous_nodes ) {
      var m,
          res,
          lastIndex = 0;

      patterns_or_re = patterns_or_re || this.dialect.inline.__patterns__;
      var re = new RegExp( "([\\s\\S]*?)(" + (patterns_or_re.source || patterns_or_re) + ")" );

      m = re.exec( text );
      if (!m) {
        // Just boring text
        return [ text.length, text ];
      }
      else if ( m[1] ) {
        // Some un-interesting text matched. Return that first
        return [ m[1].length, m[1] ];
      }

      var res;
      if ( m[2] in this.dialect.inline ) {
        res = this.dialect.inline[ m[2] ].call(
                  this,
                  text.substr( m.index ), m, previous_nodes || [] );
      }
      // Default for now to make dev easier. just slurp special and output it.
      res = res || [ m[2].length, m[2] ];
      return res;
    },

    __call__: function inline( text, patterns ) {

      var out = [],
          res;

      function add(x) {
        //D:self.debug("  adding output", uneval(x));
        if (typeof x == "string" && typeof out[out.length-1] == "string")
          out[ out.length-1 ] += x;
        else
          out.push(x);
      }

      while ( text.length > 0 ) {
        res = this.dialect.inline.__oneElement__.call(this, text, patterns, out );
        text = text.substr( res.shift() );
        forEach(res, add )
      }

      return out;
    },

    // These characters are intersting elsewhere, so have rules for them so that
    // chunks of plain text blocks don't include them
    "]": function () {},
    "}": function () {},

    "\\": function escaped( text ) {
      // [ length of input processed, node/children to add... ]
      // Only esacape: \ ` * _ { } [ ] ( ) # * + - . !
      if ( text.match( /^\\[\\`\*_{}\[\]()#\+.!\-]/ ) )
        return [ 2, text[1] ];
      else
        // Not an esacpe
        return [ 1, "\\" ];
    },

    "![": function image( text ) {

      // Unlike images, alt text is plain text only. no other elements are
      // allowed in there

      // ![Alt text](/path/to/img.jpg "Optional title")
      //      1          2            3       4         <--- captures
      var m = text.match( /^!\[(.*?)\][ \t]*\([ \t]*(\S*)(?:[ \t]+(["'])(.*?)\3)?[ \t]*\)/ );

      if ( m ) {
        if ( m[2] && m[2][0] == '<' && m[2][m[2].length-1] == '>' )
          m[2] = m[2].substring( 1, m[2].length - 1 );

        m[2] = this.dialect.inline.__call__.call( this, m[2], /\\/ )[0];

        var attrs = { alt: m[1], href: m[2] || "" };
        if ( m[4] !== undefined)
          attrs.title = m[4];

        return [ m[0].length, [ "img", attrs ] ];
      }

      // ![Alt text][id]
      m = text.match( /^!\[(.*?)\][ \t]*\[(.*?)\]/ );

      if ( m ) {
        // We can't check if the reference is known here as it likely wont be
        // found till after. Check it in md tree->hmtl tree conversion
        return [ m[0].length, [ "img_ref", { alt: m[1], ref: m[2].toLowerCase(), original: m[0] } ] ];
      }

      // Just consume the '!['
      return [ 2, "![" ];
    },

    "[": function link( text ) {

      var orig = String(text);
      // Inline content is possible inside `link text`
      var res = Markdown.DialectHelpers.inline_until_char.call( this, text.substr(1), ']' );

      // No closing ']' found. Just consume the [
      if ( !res ) return [ 1, '[' ];

      var consumed = 1 + res[ 0 ],
          children = res[ 1 ],
          link,
          attrs;

      // At this point the first [...] has been parsed. See what follows to find
      // out which kind of link we are (reference or direct url)
      text = text.substr( consumed );

      // [link text](/path/to/img.jpg "Optional title")
      //                 1            2       3         <--- captures
      // This will capture up to the last paren in the block. We then pull
      // back based on if there a matching ones in the url
      //    ([here](/url/(test))
      // The parens have to be balanced
      var m = text.match( /^\s*\([ \t]*(\S+)(?:[ \t]+(["'])(.*?)\2)?[ \t]*\)/ );
      if ( m ) {
        var url = m[1];
        consumed += m[0].length;

        if ( url && url[0] == '<' && url[url.length-1] == '>' )
          url = url.substring( 1, url.length - 1 );

        // If there is a title we don't have to worry about parens in the url
        if ( !m[3] ) {
          var open_parens = 1; // One open that isn't in the captureis.duture"oetu<ne open th) {

  *! stack.length; i++wn(dialeurl[0 *!       if ( !m[3
      '(':  if ( !m[3
   {
             wanted_depth++;
              bre     ')':  if ( !m[3
   the u--{
          v=ntained.length > 0url = m[1];
 -=rl.substring( bst= [ "listitem" ];
'>' )
          url 0, bstist.push(last_li); wanted_depth++;
              bre );
         
         
l.length - 1         "\\":sxt isl.length '>' )

        m[2] = this.dialect.inline.__calare [ll( this, m[2], /\\/];

       = { a'>' [1], href: m[2] || "" };3        if ( m[4] !== undefined)
          3, m[2], /\\/d );
       nk].length, eturn [ [ 0 ],
   ist.push(la    if ( = m[1];
,/d );
ginal: m[0] } ] ];
     }

      // ![Alt 
     }

       // ![Alt text][id]
      m      var re ][ \t]*\[(.*?)\]/ );

  var url = m[1];
      sumeconsumed += m[0].lsumed );s][]cb )w howksce is sn't check [2], /\\/];

      = { aess it
  [1]     va 0 ],
  \[\ m[1], ref: m[2]].toLowerCa.toL     text0,  = text.suef: m[2]
    d );
       nk].lengtength, eturn [ [ 0 ],
   ist      if ( m ) {
        // We can't check if the reference is known here as it likely wont be
        // found till after. Check it in md tree->hmtl.t likely wonSom_trdge cases abo rules  tree->hmtlline re);

  We can't // One  No clt.push(la    if ( = m[1];
,/d );
ginal: m[0] } ] ];
    // ![Alt 
  d... refedimages, al(lai it inof li)]*\[(.*?)\]/ 0 ],
    if ( argume!== "undefi0 ],
  ay && lao.length-1] [2], /\\/];

      = { ai0 ],
  ay  m[1], ref: m[2]].toLowerCa.toL     text0,  = text.suef: [2]
    d );
       nk].lengtength,fi0 ],
  ay &]st.push(la    if ( = m[1];
,/d );
ginal: m[0] } ] ];
      }

      // Jut consume the '!['      return [ 2,  "![" <;
    },

  th eL "[": functiononsume bala\t]*\[(.*?)\]/( text][id]
      m <]:\sistops?|ftp|mailto):[^>]+)|var @"{" .[a-zA-Z]+))>block./.exec(input) ) [(.*?)\]/ 
        if ( !m[3version
        return [   nk].l   = { a"mailto:( "( 
   { lev   onml = [ [ "k_search;
        }
  - 1 );=a"mailto[ 0 ][ 0 ] != ">version
        return [   nk].l   = { a: listrn [ m     tex"mailto:( ( li_accu &]st.push(lasearch;
      [ 0 ] != ">version
        return [   nk].l   = { a: listrn [ moriginal: m[0] } ] ]; the '!['    < return [ 2, "![" `"},

    __call__:Ccode:nction escaped( tetext);
  dlast paree i// Pul pubuttsce iing ) {

      rdealt with.  atlways null         /{
  Some uttsocess as a btext][id]
      m(`/^\ock.match( 1(.*?)\3)?[ \t]*\)/ ) m[2][0[\]()#\+.!\-]/ ) )
        retu "( 
2    return [ mext);  dl" lev   onml ch;
       
      if ( m
     Noed on if t      dlat be
 - warn!]()#\+.!\-]/ ) )
     `"ext.length, text 2, "!["   \n;
    },

    "eB
   e:nction escaped(-]/ ) )
 3rn [   ne;
   ", ret.join(
_tree;
 Meta Markdo/generatmade  a `_pturthis means thaown.pl's
  return te = []eme:nag,ter.-1] [2]    }

te_slot urla + b"];
  t      varn tex_slot urla +& lao.longth? "eak;
  }" :lao.longk;
  }")\3)?  return CmarkTag(bstithis.tree;
 bst_  // e!
 st= [ "lee;
 cume   l mark_( "(  retuines( m[0] )() {},
   ent__.c.toL_ inden-1] [2], al(x)e;
[}

te_slotif ( m[2mdn escaped( teMose saght aliststc.
 *
 *nt, m[2] = ( res ) {
      );

   " ledist.push()e;
[}

te_sloti    block = next. te"C
     "ext ) {
        oen pulwill casagruslock level     -.procebelowscaped(-]/ ) 
        return
   CmarkTag(       retu-m    if (Inline( block       
      iwonSom_tr {
  n    // * em/ans tha}

te    <--- capn text)

   [n tex_slot] Arrayb = blocks.shi;
  this)e;
[}

te_sloti  rrayb  continue blo[}

te_sloti h)
     edistm[2] = ( res ) {
    [];
  th      : {0,3}\\t| {Recur  [ 0 ] !ink text`
"para"].concat( this              d ( li_accu a proper array");
    [];
  thisay");
    [];
  t        2)eturn [ 1, '[pture      Array(res) && lstm[2] = ( res ) {
    ("r a li and cal`. i" lla + b": "  adding next );)eturn [ 1, '[    //is)e;
[}

te_sloti    var b = nextth-1];

  if (last_lCmarkTagtext.length > 0ublist = last_li( m ) nterest! Huzzahlt.push(la, '[' ];

     

      whil-[ptur bst_  // st.push(la    if ( = m[1];
,/[lla + eturn [   if dialects[dialect];
      }
     | {Resom_trdge ;
  th  // * n text   /ren inext block mi;
 ke...  markdecial and o 

   [n tex_slot]   n tex;l and o 

   [}

te_sloti      test      if ( m ) {
    reb )      /ngth ofn the ite is k the block ws thahe
 *        xtorry cial and o 
-]/ ) )
  d = res || dext.length, text etui openErocess `bofn // The m} ];
    }
  }
};

Markdown.dialec["**"i      = []emeao.longt   **"t =;
    }
  }
};

Markdown.dialec["__"i      = []emeao.longt   __"t =;
    }
  }
};

Markdown.dialec["*"i       = []emeaemt   *"t =;
    }
  }
};

Markdown.dialec["_"i       = []emeaemt   _"t =ee;
 Bu ],Gruber
 *    oi`. in if;

Eleme   o.=;
    }
  * Ndml, tOr2;
   lock(re, dbug = funcct.blo;

   , next);
  }regeon escape]*\)/i+& la      ord" [1]i+& la  r__;

  .indent != m[1]  vare;
   iount_lin  d
      ord   nrd);
  retuBu ],Gn inline(r bloc, uneval(ler=;
    }
  * Ndand caP inline(  lock(re, dbug = funcp inline(         , next);
  }regeon escapeetu__foord / TOD wantdis me    acp inlinscape]*\)/i]
      m __.*__$/) .indent != m[1] , '[p    ar input =  = n.*+?|()h( /{}])place\\$1"_list.exec( m[2]ar input = e_no]e\\= lines.jop inlinere;
   i  if ( argume? "hea_typ( "(l patterns_tuines(p inline(  p inlinerode_bl|for meds.dialect.inl(  p inliner me         p inline   //print(on inline( t)ks = [],
fure"ds.dialectr meds.dialect(  lock(re, nt__.call(thin escape]*\)all(thirce;

  if (li escaped(-]/ ) )fne.__oneElement__.call(thi)ine( block      ock  escaped(-]/ ) )fne.__oneElement__.call(this)ine( block}ror?
  return [ res = Markdowattrs.r      var res = Markdown.DialectHelpers.i(  lock(re, ent__.c   lock( block,  ];

     0= blocks ), m,         
      }
        whil* + - . !( = m[1];
 && ne   lock( blcapeetuF be
  h },

    //ther* If s in this b blcape= m[1];
    wanted    if ( = m[1];
,/ ), m,et.join(
_whil* + -= m[1];
 >  

      whilck( blcapeetu]' );

    rs.i( No cloAborial and out ) {

ullt.join(
_whilink text`
"para     res = this.dialect.inline.__oneElement__     text = text.sustr( m[0] m[1];
     consume;scapeetu
   / Puess `bofn ), mal and ), ma
        jso ), m,t = te    thisustr( m}n++;
  Markdoototype.toTrfault    -cptusfor an
 * The now tor      var   cptus res = (  lock(re, eeon escatotype.toml, th "}"scaml, t} ];
     re"ds.proc;scatotype.toat( thi "}"scaat( th} ];
     re"ds = thiineNumber = {cts.Grub
   ml, th on add(lub
   at( thi "}ror?
  return [ * Ndml, tOr2;
 (ts = {};

/**
 * Markdown..proces;=;
    }
  * Ndand caP inline(ts = {};

/**
 * Markdown.in this.) ];
    }
  }
};

Ma;
 ukut`
      var   cptus res = (ts = {};

/**
 * Markdowns.) ];
    }
  }
};

Ma;
 ukua"].concMetaHe a e.processInline = MetaHe a(de  a_ {
  //ck( block,e  a     soure  a_he a(de  a_ {
  //c= blocksengt t ),
    , next);
  }

  for (e  a th) {

 ++ion escapeetuid: #f might * + -/^#/.  ([(de  a    l_attr( this.tengt.i    e  a    l       url = ly( this.tree,hem ptus: .f might       }
  /^\./.  ([(de  a    l_attr( this.t
      ptus  // If th if  // ppenin this liones at enn't exist[' ptus'       if ( !mxist[' ptus'  =mxist[' ptus'  + e  a    l r input = .no]e {0,3}\t/g, " \t/g, ;
      }
     xist[' ptus'  =me  a    l       url = ly( thisth, text etulement    // m: , o=  Foo
        }
  /\=/.  ([(de  a    l_attr( this.til = "\ne  a    l   lines ==.*?)\2)?[ \xist[ onsume1].to   chiine( block )eNumber = xistly( n.split_blocks re  a_he a(de  a_ {
  //ck( block,e  a   e  a_ {
  /   lines"h + "}.*?\\he

Mark[s"h ildren = in_ inpus             
      }e  a th) {
ttr( thisis.dutt// e!
e  a    var b = newn(dialeuutt// etr( this.t     e {0:  if ( !m
     we'ese c an inpud selit_b, [];

alt with. R]*\)/in_ inpus 0 ][ 0 ] != ">he

M[>he

Mubstring( 1,t[ ouutt// st.push(lasearch;
  s to texwi    e );

s lihe

earch;
                  ehe

Mue;
   " lines.join( search;
  ;
                e'{0:  if (      '"'0:  if ( !m
  re);
 )      inpus s me     sblocxt btl tree conin_ inpus   !in_ inpus;earch;
  ;
                e   r:  if ( !m
     va

      /on pautt// eThe pau ofnsblocxt baway.t likely wons kwa   "\\":do ruwe'll [];

albeen e);
ill as and loosett// e!
e  a    var b = ne Gruber
 *:  if ( !mhe

M[>he

Mubstring( 1,t[ ouutt// st.push(la;
         lock )eNumber = he

M;m} ];
    }
  }
};

Ma;
 ukuast parng the m_e  a   .split_blng the m_e  aa: function para( bl    e'eseo... r    // e
      /t this ry* linek, if any
x, b.trailin>hisush(re) )
        retur   ng the m_e  a s of pl] m[i pull , resulting// keepll `Key: V[0] \n`inek, if!ks
      var m = bl\w+:.if (*\w+:.i$/!block.match( re ) ) returdefined;

      // make an attribute node if it n't exist
      if ( !extract_attr( thise ) ) {
        this.tree.splice}s = [],
pair        var lines = blo
   , nextpan adair  tr( thisis.dm(  p ir [>h ]]
      m(\w+):atch( )$block.split( key     er", m[1], ref: m[2t.push(la, d re=   var st     e ) ) {
  er",[ key ].to, d rlice}s =    ng the m_e  a lindu   ano
      /!eNumber = error?
  return [ }
};

Ma;
 ukuast par      e  a   .split_bl      e  aa: function para( bl       // We can];

 d callopriate.
 *line
  e  a he a
isis.dm(  s
      var m (^|\in eput.r{:atch bl\\\}|[^\}])*^(#{\}$/ply( print );
        if ( !m ) returextr           e  a he a
isis.dengt t "para     resline = MetaHe a(de var l)ks = [],
he areturext   we nterest ^in thewe adjac, no   j e  a will ca // Procery* linek, ifs it
  evel " tr( thisis.dke an= e ) ) {
  ee ) ) {
  bstring( 1,t      he a e.ist
      if (ke an)eturn [
      }

 e an    / {
  //(ra text inde`sourctr( ail whil* + - "undefke an=& lao.length-1h(re) )
        return     pths.
 }

     // make a references hash if it dorint )ke a 0 ][ 0 ] !he a e.rs.referenke a       this.treke a 0t.join(
_whilment in thi     // msckquote , nextae c angt 0 ][ 0 ] !he a[tae  =mxist[tae t.join(
_whilmenut ) {

o{
    so     e  a he a / TOD    ve to ing ) );

   }s =    
        e  a he a 
      /e.
 *ls mer       een 'suutft
) ) {
         ar input = e_.i$/,s"h + "}.*?\\ the it) {
      var b = this,revious =    gf the ined; thi     // msche a
ishe a e.ist
      if ( the insume1ly( print )ke a 0 ][ 0 ]he a e.rs.refer the insume       this.treke a 0t.jo}s =      ied tothi     // mscwill cary* line, nextae c angt 0 ][ 0 ]he a[tae  =mxist[tae t.jo )eNumber =  the iror?
  return [ }
};

Ma;
 ukuast par     iit_b        .split_bln    iit_b     a: function para( bl   , resulting/t mamany blased to, resulting/n    iit_bon pc ansforlcary* line) {
ock lo],
  \s*\^\s:].if (+):at+ock.mat+)$b "}.*?\\       [s"dlh ildren = ius =    see    we'ese wil         a
ock losul);

  ry* linek, if(dm(  s
      var mock lo)_attr( this   
    sat the indock loDL/ Deal wiupull `ne inside stom_root ) {[/e.
 *l t.joinrge it in
      while (ock l);

    next.len_attr( this.t       e;
           var  0t.join(
_whil, next);
 b}

  fbif ( m[0s th) {

 ++bttr( this.til =m(  s
    [>b ]]
      ock lo)= blocks.shit mama    er", r input = e_$/,s"h +ar lines = block.split( /\n  nse=   var ar lines = :at+.*?)\3)?[ \textr             / );
?)\3)?[ \t, next }

  for (t mam th) {

 ++ion escape*?\\    ) {
      d("  t mam    l_vious_nodes |3)?[ \t, next }

  for (n  ns th) {

 ++ion escape*?\\menuu_call__:er      if th       /n    iit_bscape*?\\    ) {
      ddli.push( [ 
"para"].concat( thisn  ns    l r input = (f (at+.,s"$1"_l last_li.splic, text etui
              !m ) {
        retu )eNumber = [\     rror?
  return [ }
};

Ma;
 ukua = this."{:"e  =m

    __call__: e  aa:nt__.c // int, text,     rint )
         on escape the '!['
   {:"e t.jo}s =    gf tl ca //cdjaters at.inl
) ) {
 efons__;ing")
         g( 1,t  
il* + - "undef efons__dd_to.length-1] == " the '!['
   {:"e t.jo}s =     indent e  a he a
isis.dm(  ][id]
      m  {:atch bl\\\}|[^\}])*^(#{\}/ious =    noed on ,       alarm( print );
  ] == " the '!['
   {:"e t.jo}s =      ied tothi     // mscwill ca //cdjaters at.inl
) ) {
e  a   "para     resline = MetaHe a(de vt
   = blocksengt t ist
      if ( efons_)  
il* + -!angt 0 ][ 0 ]engt t ),
 is.t efons       this.treangt 0t.jo}s = , next);
 k afte  a 0 ][ 0 ]engt[ k   =me  a  ke t.jo}s =    cut     // s {
  //he leame arril have

o{
   
!\-]/ ) )
   sumeconsume,s"h rror?
  return [ * Ndml, tOr2;
 (ts = {};

/**
 * Ma;
 ukuast paes;=;
    }
  * Ndand caP inline(ts = {};

/**
 * Ma;
 ukua = thi_)  
);
  si[1] i=ength } si[1] i|| lock(re, obj0 ][ 0-]/ ) )Obj reslin
      to     ve.__onobj0 l[ur[obj reength ]'ror?
       () );;;
  D is am    eave
ngth } ];
       Itin somfriendly
* + -ngth } ];
      passed tn escatassed t  lock(re, earrctiosh.appp
  ] == " the '!arr.phs
     iosh.appp
 t.jo};m}          tassed t  lock(re, arrctiosh.appp  ] == "t(nl);

  }

  for (arr. = 0; i < stack.lengt].length );
pi|| arrctarrar w pararr)ine( block}y( n.split_blist
      if (ned;

 0 ][ 0-]/ ) ) si[1] (ned;

list.exee (his.tres_str && aist.exee ( "undefhis.tr it
  evel obj re"ist.exee (!() si[1] (ned;

 it
 \[\]()#\+.?fhis.tr it
 ]()#\+.:{
        ren li
/** syn0-]   r`sourc (ned;

[, tth/tosn_at->]     v syn0-(ned;

 (i[1] ):e`sourc     //wil-]   r/wilXML syn0-(tth/tos (Obj re):etth/tos sy syn0Cree->t      ing an`sourc      well- it sedXML. sy syn0T  /{
h/tos ragraph j 
   rstood kin: sy syn0- rosom(Boolean):ewe text    /  // Noosomke an/ |bar
   xt bloc
      / syn0 .debug(,ck level s sn 0 ],
   0T  /ruber
 *`     ` / Tock,otext blocks d syn0 .oosoms s {
  sy/
exed l.-]   r`sourct  lock(re, enml.push{
h/tos 0 ][ 0{
h/tos =0{
h/tos || ),
 is)))?\ blocks d.oosomany bloc     /t-]   reslurp sp?[ 0{
h/tos.oosom=0{
h/tos.oosom|| l         nt li
    this[t  
il* + -{
h/tos.oosomtack.leni
    t) {
   -]   r),
   (ned;

 0 unt_lin             his.tre   var b    gf tridllopriattagit dorint his.tres_str &e ( "undefhis.tr i0
  evel obj re"ee (!()his.tr i0
   if (last_li[1] iattr( this.this.tre   var b    gf tridllopriat     // ms.join(
_whilrge it ihis.tres_str &tack.lengt]
    t) {
   -]   r),
   (ned;

    var  0 )ine( block}y[ 0-]/ ) )]
    t)cessBlock\= liner?
  {},

    "\\":HTrc (nction esca-]/ ) )][id]r input = &place&amp;"_list.exec( m[2]ar input = <place& ir"_list.exec( m[2]ar input = >place&gir"_list.exec( m[2]ar input = "place& inpr"_list.exec( m[2]ar input = 'place&#39; liner
  {},

   -]   r),
   (ned;

 0 ( bl   basic     
il* + - "undefned;

  dd_to.length-1] == " the '! "\\":HTrc (ned;

 0lice}s = [],
la +&(ned;

    var = blocksengt // msc="]": func li
    this[t  
il* + -his.tres_str &e ( "undefhis.tr i0
  evel obj re"ee (!()his.tr i0
   if (last_li[1] iattr( thisengt // msc="his.tre   var bice}s = rge it ihis.tres_str &tack.len]
    t) {
   argthe mslengt   (ned;

    var  0 )ine(}s = [],
la _];

    li_acc, next);
 ae c angt // msctr( thisea _];

       pth +th '="'th  "\\":HTrc (angt // ms[tae  | pa'"'t.jo}s =    lockkinful't haveD:self.t lists haferencr bloc, une only. n
il* + - a +& lam[0]= pata +& labr]= pata +& lar js-1] == " the '!"<"+lla + bea _];

    "/>"nt_lin              the '!"<"+lla + bea _];

    ">pth ]
    t)cessBlo" | pa"</" +lla + b">"nt_linr
  {},

   tree->t),
  _to_htmine.
  ,
      // msh{
h/tos 0 ][ 0;

  ;[ 0{
h/tos =0{
h/tos || ),
  =    shts ar{
  n 
undefined;

    {
       th0_)  
il* +  == "str
h/tos. //line = ml.pNe an=& la {},

  "tr( this.this.trm=0{
h/tos. //line = ml.pNe a(nml.push      // m0t.jo}s =    C  n       // msck. But
 h if it 
      }

      var attrs ned;

 0licen't exist
s-1] == "his.tr it
  e ),
 is.t, next } c angtsttr( this.this.tr er",[ ie  =mxists    l( this.tree,   }

  his.tr er",t.jo}s =    lasic     
il* + - "undefned;

  dd_to.length-1] == " the '!;

      r}s =    cree->t
 *
 *ke a
newn(dialeuhis.tr i0
  tack.len]    ehea  r": this.this.tr e0
  e eh" +lhis.tr er",.ndentb = ne Gruletelhis.tr er",.ndentb = ne G;
         ]    e           : this.this.tr e0
  e eul"b = ne G;
         ]    e           : this.this.tr e0
  e eol"b = ne G;
         ]    e   last_l: this.this.tr e0
  e eli"b = ne G;
         ]    e     : this.this.tr e0
  e ep"b = ne G;
         ]    eut the o": this.this.tr e0
  e ehtmi"b = ne Gn't exist
s-1ruletel      var ref = b = ne G;
         ]    e  dlnext.u : this.this.tr e0
  e epre"b = ne Gn =mxists.?f2.:{(m[1].lennt li
 an= [ e  dl"ext.length  dla
        jso  dl,(ned;

          ast_li.splichis.tr eie  =m  dlb = ne G;
         ]    emext);  dl": this.this.tr e0
  e e  dl"b = ne G;
         ]    em[0]: this.this.tr er",.src
  his.tr er",. = {b = ne Gruletelhis.tr er",. = {b = ne G;
         ]    e  ne;
   ": this.this.tr e0
  e ebr]
 is.t 
         ]    e  n ": this.this.tr e0
  e ea"b = ne G;
         ]    e  nk].len: this.this.tr e0
  e ea"b  this.t   g //  // TODfl lineleanre all l     // make a[1].lennt l);

  var ref = at      varnml = [ [ "
      }

't check ih if  //ined; thi  nk = ne Gn't evarnn escape*?\\ruletel      varst      if ( mad
      /thODfl lin ref_idn'tplit     // Add       h);

  var. = {b = ne G Gn't evar
      0 ][ 0 ] != ">ined)
        var
     b = ne G G 
l.length - 1gf tridllopriatunadjaesluases abo // Just boriruletel      uases abli.splic, texth - 1 }

't check inces hash if rstinre);

  up s, alt te texth                mber = xist  uases abli.splic, texth ;
         ]    em[0].len: this.this.tr e0
  e em[0]b  this.t   g //  // TODfl lineleanre all l     // make a[1].lennt l);

  var ref = at      varnml = [ [ "
      }

't check ih if  //ined; thi  nk = ne Gn't evarnn escape*?\\ruletel      varst      if ( mad
      /thODfl lin ref_idn'tplit     // Add       src
  var. = {b = ne G Gn't evar
      0 ][ 0 ] != ">ined)
        var
     b = ne G G 
l.length - 1gf tridllopriatunadjaesluases abo // Just boriruletel      uases abli.splic, texth - 1 }

't check inces hash if rstinre);

  up s, alt te texth                mber = xist  uases abli.splic, texth ;
       }s =    cree->t
a        0 ],
  
 Gn =m1retur   n

       ll l     // make a, refereh if  icen't exist
s-1] == "
      }
  // onkey //null      alt wit, next);
 ke. r "his.tr it
  te( block,  =m2( this.tree,
      }
  // o ha,TOD     alt wit]*\)/i+& =hisus( this.this.tre         ,= ly( this.tre}s = , next for (his.tres_str 
 ++ion escapehis.tr eie  =margthe mslengt   (ned;

 eie ,
      // msh{
h/tos 0retu )eNumber = ;

     }=ee;
 so a smadjaght anctio ), m,     ansforlcake a[fined;

  o a _nctix ), m (ned;

 0 ( bl   null riattag cume  lin     // make a[ 0;

  
      var attrs ned;

 0.?f2.:{(m[
= rge it ior (his.tres_str s-1] == "
     it'   / {
  //    //   /on paast_  umight * + - "undefhis.tr ii
  evel o.length-1] == "st]*\)/i++= l (his.tres_str se ( "undefhis.tr ii++= l  evel o.length-1] == "st=     o a b// s ;   means  //       /t this he lea     alt witcapehis.tr eie  +=(ned;

          a+his. lynsume;scape, " \t/g, ;
      }
     ++ili.splic, text etu "
     it'      acans  //recur  [ 0 ];
      }
   argthe mslengt   (ned;

 eie t_li.splic++ili.spllock}y( n} )( (lock(re, ,     rint  "undefexed

Marvel 
        th-1] == "winhe .ut the o e.rs.refer ter = winhe .ut the ont_lin              the '!exed

Mnt_linr )(st_l