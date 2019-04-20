/*! layer-v3.0.1 Web弹层组件  */
; !
function(e, t) {
    "use strict";
    var i, n, a = e.layui && layui.define,
    o = {
        getPath: function() {
            var e = document.scripts,
            t = e[e.length - 1],
            i = t.src;
            if (!t.getAttribute("merge")) return i.substring(0, i.lastIndexOf("/") + 1)
        } (),
        config: {},
        end: {},
        minIndex: 0,
        minLeft: [],
        btn: ["&#x786E;&#x5B9A;", "&#x53D6;&#x6D88;"],
        type: ["dialog", "page", "iframe", "loading", "tips"]
    },
    r = {
        v: "3.0.1",
        ie: function() {
            var t = navigator.userAgent.toLowerCase();
            return !! (e.ActiveXObject || "ActiveXObject" in e) && ((t.match(/msie\s(\d+)/) || [])[1] || "11")
        } (),
        index: e.layer && e.layer.v ? 1e5: 0,
        path: o.getPath,
        config: function(e, t) {
            return e = e || {},
            r.cache = o.config = i.extend({},
            o.config, e),
            r.path = o.config.path || r.path,
            "string" == typeof e.extend && (e.extend = [e.extend]),
            o.config.path && r.ready(),
            e.extend ? (a ? layui.addcss("modules/layer/" + e.extend) : r.link("skin/" + e.extend), this) : this
        },
        link: function(t, n, a) {
            if (r.path) {
                var o = i("head")[0],
                l = document.createElement("link");
                "string" == typeof n && (a = n);
                var s = (a || t).replace(/\.|\//g, ""),
                f = "layuicss-" + s,
                c = 0;
                l.rel = "stylesheet",
                l.href = r.path + t,
                l.id = f,
                i("#" + f)[0] || o.appendChild(l),
                "function" == typeof n && !
                function d() {
                    return++c > 80 ? e.console && console.error("layer.css: Invalid") : void(1989 === parseInt(i("#" + f).css("width")) ? n() : setTimeout(d, 100))
                } ()
            }
        },
        ready: function(e) {
            var t = "skinlayercss",
            i = "1110";
            return a ? layui.addcss("modules/layer/default/layer.css?v=" + r.v + i, e, t) : r.link("skin/default/layer.css?v=" + r.v + i, e, t),
            this
        },
        alert: function(e, t, n) {
            var a = "function" == typeof t;
            return a && (n = t),
            r.open(i.extend({
                content: e,
                yes: n
            },
            a ? {}: t))
        },
        confirm: function(e, t, n, a) {
            var l = "function" == typeof t;
            return l && (a = n, n = t),
            r.open(i.extend({
                content: e,
                btn: o.btn,
                yes: n,
                btn2: a
            },
            l ? {}: t))
        },
        msg: function(e, n, a) {
            var l = "function" == typeof n,
            f = o.config.skin,
            c = (f ? f + " " + f + "-msg": "") || "layui-layer-msg",
            d = s.anim.length - 1;
            return l && (a = n),
            r.open(i.extend({
                content: e,
                time: 3e3,
                shade: !1,
                skin: c,
                title: !1,
                closeBtn: !1,
                btn: !1,
                resize: !1,
                end: a
            },
            l && !o.config.skin ? {
                skin: c + " layui-layer-hui",
                anim: d
            }: function() {
                return n = n || {},
                (n.icon === -1 || n.icon === t && !o.config.skin) && (n.skin = c + " " + (n.skin || "layui-layer-hui")),
                n
            } ()))
        },
        load: function(e, t) {
            return r.open(i.extend({
                type: 3,
                icon: e || 0,
                resize: !1,
                shade: .01
            },
            t))
        },
        tips: function(e, t, n) {
            return r.open(i.extend({
                type: 4,
                content: [e, t],
                closeBtn: !1,
                time: 3e3,
                shade: !1,
                resize: !1,
                fixed: !1,
                maxWidth: 210
            },
            n))
        }
    },
    l = function(e) {
        var t = this;
        t.index = ++r.index,
        t.config = i.extend({},
        t.config, o.config, e),
        document.body ? t.creat() : setTimeout(function() {
            t.creat()
        },
        50)
    };
    l.pt = l.prototype;
    var s = ["layui-layer", ".layui-layer-title", ".layui-layer-main", ".layui-layer-dialog", "layui-layer-iframe", "layui-layer-content", "layui-layer-btn", "layui-layer-close"];
    s.anim = ["layer-anim", "layer-anim-01", "layer-anim-02", "layer-anim-03", "layer-anim-04", "layer-anim-05", "layer-anim-06"],
    l.pt.config = {
        type: 0,
        shade: .3,
        fixed: !0,
        move: s[1],
        title: "&#x4FE1;&#x606F;",
        offset: "auto",
        area: "auto",
        closeBtn: 1,
        time: 0,
        zIndex: 19891014,
        maxWidth: 360,
        anim: 0,
        icon: -1,
        moveType: 1,
        resize: !0,
        scrollbar: !0,
        tips: 2
    },
    l.pt.vessel = function(e, t) {
        var n = this,
        a = n.index,
        r = n.config,
        l = r.zIndex + a,
        f = "object" == typeof r.title,
        c = r.maxmin && (1 === r.type || 2 === r.type),
        d = r.title ? '<div class="layui-layer-title" style="' + (f ? r.title[1] : "") + '">' + (f ? r.title[0] : r.title) + "</div>": "";
        return r.zIndex = l,
        t([r.shade ? '<div class="layui-layer-shade" id="layui-layer-shade' + a + '" times="' + a + '" style="' + ("z-index:" + (l - 1) + "; background-color:" + (r.shade[1] || "#000") + "; opacity:.6; filter:alpha(opacity=60);") + '"></div>': "", '<div class="' + s[0] + (" layui-layer-" + o.type[r.type]) + (0 != r.type && 2 != r.type || r.shade ? "": " layui-layer-border") + " " + (r.skin || "") + '" id="' + s[0] + a + '" type="' + o.type[r.type] + '" times="' + a + '" showtime="' + r.time + '" conType="' + (e ? "object": "string") + '" style="z-index: ' + l + "; width:" + r.area[0] + ";height:" + r.area[1] + (r.fixed ? "": ";position:absolute;") + '">' + (e && 2 != r.type ? "": d) + '<div id="' + (r.id || "") + '" class="layui-layer-content' + (0 == r.type && r.icon !== -1 ? " layui-layer-padding": "") + (3 == r.type ? " layui-layer-loading" + r.icon: "") + '">' + (0 == r.type && r.icon !== -1 ? '<i class="layui-layer-ico layui-layer-ico' + r.icon + '"></i>': "") + (1 == r.type && e ? "": r.content || "") + '</div><span class="layui-layer-setwin">' +
        function() {
            var e = c ? '<a class="layui-layer-min" href="javascript:;"><cite></cite></a><a class="layui-layer-ico layui-layer-max" href="javascript:;"></a>': "";
            return r.closeBtn && (e += '<a class="layui-layer-ico ' + s[7] + " " + s[7] + (r.title ? r.closeBtn: 4 == r.type ? "1": "2") + '" href="javascript:;"></a>'),
            e
        } () + "</span>" + (r.btn ?
        function() {
            var e = "";
            "string" == typeof r.btn && (r.btn = [r.btn]);
            for (var t = 0,
            i = r.btn.length; t < i; t++) e += '<a class="' + s[6] + t + '">' + r.btn[t] + "</a>";
            return '<div class="' + s[6] + " layui-layer-btn-" + (r.btnAlign || "") + '">' + e + "</div>"
        } () : "") + (r.resize ? '<span class="layui-layer-resize"></span>': "") + "</div>"], d, i('<div class="layui-layer-move"></div>')),
        n
    },
    l.pt.creat = function() {
        var e = this,
        t = e.config,
        a = e.index,
        l = t.content,
        f = "object" == typeof l,
        c = i("body");
        if (!i("#" + t.id)[0]) {
            switch ("string" == typeof t.area && (t.area = "auto" === t.area ? ["", ""] : [t.area, ""]), t.shift && (t.anim = t.shift), 6 == r.ie && (t.fixed = !1), t.type) {
            case 0:
                t.btn = "btn" in t ? t.btn: o.btn[0],
                r.closeAll("dialog");
                break;
            case 2:
                var l = t.content = f ? t.content: [t.content || "http://layer.layui.com", "auto"];
                t.content = '<iframe scrolling="' + (t.content[1] || "auto") + '" allowtransparency="true" id="' + s[4] + a + '" name="' + s[4] + a + '" onload="this.className=\'\';" class="layui-layer-load" frameborder="0" src="' + t.content[0] + '"></iframe>';
                break;
            case 3:
                delete t.title,
                delete t.closeBtn,
                t.icon === -1 && 0 === t.icon,
                r.closeAll("loading");
                break;
            case 4:
                f || (t.content = [t.content, "body"]),
                t.follow = t.content[1],
                t.content = t.content[0] + '<i class="layui-layer-TipsG"></i>',
                delete t.title,
                t.tips = "object" == typeof t.tips ? t.tips: [t.tips, !0],
                t.tipsMore || r.closeAll("tips")
            }
            e.vessel(f,
            function(n, r, d) {
                c.append(n[0]),
                f ?
                function() {
                    2 == t.type || 4 == t.type ?
                    function() {
                        i("body").append(n[1])
                    } () : function() {
                        l.parents("." + s[0])[0] || (l.data("display", l.css("display")).show().addClass("layui-layer-wrap").wrap(n[1]), i("#" + s[0] + a).find("." + s[5]).before(r))
                    } ()
                } () : c.append(n[1]),
                i(".layui-layer-move")[0] || c.append(o.moveElem = d),
                e.layero = i("#" + s[0] + a),
                t.scrollbar || s.html.css("overflow", "hidden").attr("layer-full", a)
            }).auto(a),
            2 == t.type && 6 == r.ie && e.layero.find("iframe").attr("src", l[0]),
            4 == t.type ? e.tips() : e.offset(),
            t.fixed && n.on("resize",
            function() {
                e.offset(),
                (/^\d+%$/.test(t.area[0]) || /^\d+%$/.test(t.area[1])) && e.auto(a),
                4 == t.type && e.tips()
            }),
            t.time <= 0 || setTimeout(function() {
                r.close(e.index)
            },
            t.time),
            e.move().callback(),
            s.anim[t.anim] && e.layero.addClass(s.anim[t.anim]).data("anim", !0)
        }
    },
    l.pt.auto = function(e) {
        function t(e) {
            e = l.find(e),
            e.height(f[1] - c - d - 2 * (0 | parseFloat(e.css("padding"))))
        }
        var a = this,
        o = a.config,
        l = i("#" + s[0] + e);
        "" === o.area[0] && o.maxWidth > 0 && (r.ie && r.ie < 8 && o.btn && l.width(l.innerWidth()), l.outerWidth() > o.maxWidth && l.width(o.maxWidth));
        var f = [l.innerWidth(), l.innerHeight()],
        c = l.find(s[1]).outerHeight() || 0,
        d = l.find("." + s[6]).outerHeight() || 0;
        switch (o.type) {
        case 2:
            t("iframe");
            break;
        default:
            "" === o.area[1] ? o.fixed && f[1] >= n.height() && (f[1] = n.height(), t("." + s[5])) : t("." + s[5])
        }
        return a
    },
    l.pt.offset = function() {
        var e = this,
        t = e.config,
        i = e.layero,
        a = [i.outerWidth(), i.outerHeight()],
        o = "object" == typeof t.offset;
        e.offsetTop = (n.height() - a[1]) / 2,
        e.offsetLeft = (n.width() - a[0]) / 2,
        o ? (e.offsetTop = t.offset[0], e.offsetLeft = t.offset[1] || e.offsetLeft) : "auto" !== t.offset && ("t" === t.offset ? e.offsetTop = 0 : "r" === t.offset ? e.offsetLeft = n.width() - a[0] : "b" === t.offset ? e.offsetTop = n.height() - a[1] : "l" === t.offset ? e.offsetLeft = 0 : "lt" === t.offset ? (e.offsetTop = 0, e.offsetLeft = 0) : "lb" === t.offset ? (e.offsetTop = n.height() - a[1], e.offsetLeft = 0) : "rt" === t.offset ? (e.offsetTop = 0, e.offsetLeft = n.width() - a[0]) : "rb" === t.offset ? (e.offsetTop = n.height() - a[1], e.offsetLeft = n.width() - a[0]) : e.offsetTop = t.offset),
        t.fixed || (e.offsetTop = /%$/.test(e.offsetTop) ? n.height() * parseFloat(e.offsetTop) / 100 : parseFloat(e.offsetTop), e.offsetLeft = /%$/.test(e.offsetLeft) ? n.width() * parseFloat(e.offsetLeft) / 100 : parseFloat(e.offsetLeft), e.offsetTop += n.scrollTop(), e.offsetLeft += n.scrollLeft()),
        i.attr("minLeft") && (e.offsetTop = n.height() - (i.find(s[1]).outerHeight() || 0), e.offsetLeft = i.css("left")),
        i.css({
            top: e.offsetTop,
            left: e.offsetLeft
        })
    },
    l.pt.tips = function() {
        var e = this,
        t = e.config,
        a = e.layero,
        o = [a.outerWidth(), a.outerHeight()],
        r = i(t.follow);
        r[0] || (r = i("body"));
        var l = {
            width: r.outerWidth(),
            height: r.outerHeight(),
            top: r.offset().top,
            left: r.offset().left
        },
        f = a.find(".layui-layer-TipsG"),
        c = t.tips[0];
        t.tips[1] || f.remove(),
        l.autoLeft = function() {
            l.left + o[0] - n.width() > 0 ? (l.tipLeft = l.left + l.width - o[0], f.css({
                right: 12,
                left: "auto"
            })) : l.tipLeft = l.left
        },
        l.where = [function() {
            l.autoLeft(),
            l.tipTop = l.top - o[1] - 10,
            f.removeClass("layui-layer-TipsB").addClass("layui-layer-TipsT").css("border-right-color", t.tips[1])
        },
        function() {
            l.tipLeft = l.left + l.width + 10,
            l.tipTop = l.top,
            f.removeClass("layui-layer-TipsL").addClass("layui-layer-TipsR").css("border-bottom-color", t.tips[1])
        },
        function() {
            l.autoLeft(),
            l.tipTop = l.top + l.height + 10,
            f.removeClass("layui-layer-TipsT").addClass("layui-layer-TipsB").css("border-right-color", t.tips[1])
        },
        function() {
            l.tipLeft = l.left - o[0] - 10,
            l.tipTop = l.top,
            f.removeClass("layui-layer-TipsR").addClass("layui-layer-TipsL").css("border-bottom-color", t.tips[1])
        }],
        l.where[c - 1](),
        1 === c ? l.top - (n.scrollTop() + o[1] + 16) < 0 && l.where[2]() : 2 === c ? n.width() - (l.left + l.width + o[0] + 16) > 0 || l.where[3]() : 3 === c ? l.top - n.scrollTop() + l.height + o[1] + 16 - n.height() > 0 && l.where[0]() : 4 === c && o[0] + 16 - l.left > 0 && l.where[1](),
        a.find("." + s[5]).css({
            "background-color": t.tips[1],
            "padding-right": t.closeBtn ? "30px": ""
        }),
        a.css({
            left: l.tipLeft - (t.fixed ? n.scrollLeft() : 0),
            top: l.tipTop - (t.fixed ? n.scrollTop() : 0)
        })
    },
    l.pt.move = function() {
        var e = this,
        t = e.config,
        a = i(document),
        l = e.layero,
        s = l.find(t.move),
        f = l.find(".layui-layer-resize"),
        c = {};
        return t.move && s.css("cursor", "move"),
        s.on("mousedown",
        function(e) {
            e.preventDefault(),
            t.move && (c.moveStart = !0, c.offset = [e.clientX - parseFloat(l.css("left")), e.clientY - parseFloat(l.css("top"))], o.moveElem.css("cursor", "move").show())
        }),
        f.on("mousedown",
        function(e) {
            e.preventDefault(),
            c.resizeStart = !0,
            c.offset = [e.clientX, e.clientY],
            c.area = [l.outerWidth(), l.outerHeight()],
            o.moveElem.css("cursor", "se-resize").show()
        }),
        a.on("mousemove",
        function(i) {
            if (c.moveStart) {
                var a = i.clientX - c.offset[0],
                o = i.clientY - c.offset[1],
                s = "fixed" === l.css("position");
                if (i.preventDefault(), c.stX = s ? 0 : n.scrollLeft(), c.stY = s ? 0 : n.scrollTop(), !t.moveOut) {
                    var f = n.width() - l.outerWidth() + c.stX,
                    d = n.height() - l.outerHeight() + c.stY;
                    a < c.stX && (a = c.stX),
                    a > f && (a = f),
                    o < c.stY && (o = c.stY),
                    o > d && (o = d)
                }
                l.css({
                    left: a,
                    top: o
                })
            }
            if (t.resize && c.resizeStart) {
                var a = i.clientX - c.offset[0],
                o = i.clientY - c.offset[1];
                i.preventDefault(),
                r.style(e.index, {
                    width: c.area[0] + a,
                    height: c.area[1] + o
                }),
                c.isResize = !0
            }
        }).on("mouseup",
        function(e) {
            c.moveStart && (delete c.moveStart, o.moveElem.hide(), t.moveEnd && t.moveEnd()),
            c.resizeStart && (delete c.resizeStart, o.moveElem.hide())
        }),
        e
    },
    l.pt.callback = function() {
        function e() {
            var e = a.cancel && a.cancel(t.index, n);
            e === !1 || r.close(t.index)
        }
        var t = this,
        n = t.layero,
        a = t.config;
        t.openLayer(),
        a.success && (2 == a.type ? n.find("iframe").on("load",
        function() {
            a.success(n, t.index)
        }) : a.success(n, t.index)),
        6 == r.ie && t.IE6(n),
        n.find("." + s[6]).children("a").on("click",
        function() {
            var e = i(this).index();
            if (0 === e) a.yes ? a.yes(t.index, n) : a.btn1 ? a.btn1(t.index, n) : r.close(t.index);
            else {
                var o = a["btn" + (e + 1)] && a["btn" + (e + 1)](t.index, n);
                o === !1 || r.close(t.index)
            }
        }),
        n.find("." + s[7]).on("click", e),
        a.shadeClose && i("#layui-layer-shade" + t.index).on("click",
        function() {
            r.close(t.index)
        }),
        n.find(".layui-layer-min").on("click",
        function() {
            var e = a.min && a.min(n);
            e === !1 || r.min(t.index, a)
        }),
        n.find(".layui-layer-max").on("click",
        function() {
            i(this).hasClass("layui-layer-maxmin") ? (r.restore(t.index), a.restore && a.restore(n)) : (r.full(t.index, a), setTimeout(function() {
                a.full && a.full(n)
            },
            100))
        }),
        a.end && (o.end[t.index] = a.end)
    },
    o.reselect = function() {
        i.each(i("select"),
        function(e, t) {
            var n = i(this);
            n.parents("." + s[0])[0] || 1 == n.attr("layer") && i("." + s[0]).length < 1 && n.removeAttr("layer").show(),
            n = null
        })
    },
    l.pt.IE6 = function(e) {
        i("select").each(function(e, t) {
            var n = i(this);
            n.parents("." + s[0])[0] || "none" === n.css("display") || n.attr({
                layer: "1"
            }).hide(),
            n = null
        })
    },
    l.pt.openLayer = function() {
        var e = this;
        r.zIndex = e.config.zIndex,
        r.setTop = function(e) {
            var t = function() {
                r.zIndex++,
                e.css("z-index", r.zIndex + 1)
            };
            return r.zIndex = parseInt(e[0].style.zIndex),
            e.on("mousedown", t),
            r.zIndex
        }
    },
    o.record = function(e) {
        var t = [e.width(), e.height(), e.position().top, e.position().left + parseFloat(e.css("margin-left"))];
        e.find(".layui-layer-max").addClass("layui-layer-maxmin"),
        e.attr({
            area: t
        })
    },
    o.rescollbar = function(e) {
        s.html.attr("layer-full") == e && (s.html[0].style.removeProperty ? s.html[0].style.removeProperty("overflow") : s.html[0].style.removeAttribute("overflow"), s.html.removeAttr("layer-full"))
    },
    e.layer = r,
    r.getChildFrame = function(e, t) {
        return t = t || i("." + s[4]).attr("times"),
        i("#" + s[0] + t).find("iframe").contents().find(e)
    },
    r.getFrameIndex = function(e) {
        return i("#" + e).parents("." + s[4]).attr("times")
    },
    r.iframeAuto = function(e) {
        if (e) {
            var t = r.getChildFrame("html", e).outerHeight(),
            n = i("#" + s[0] + e),
            a = n.find(s[1]).outerHeight() || 0,
            o = n.find("." + s[6]).outerHeight() || 0;
            n.css({
                height: t + a + o
            }),
            n.find("iframe").css({
                height: t
            })
        }
    },
    r.iframeSrc = function(e, t) {
        i("#" + s[0] + e).find("iframe").attr("src", t)
    },
    r.style = function(e, t, n) {
        var a = i("#" + s[0] + e),
        r = a.find(".layui-layer-content"),
        l = a.attr("type"),
        f = a.find(s[1]).outerHeight() || 0,
        c = a.find("." + s[6]).outerHeight() || 0;
        a.attr("minLeft");
        l !== o.type[3] && l !== o.type[4] && (n || (parseFloat(t.width) <= 260 && (t.width = 260), parseFloat(t.height) - f - c <= 64 && (t.height = 64 + f + c)), a.css(t), c = a.find("." + s[6]).outerHeight(), l === o.type[2] ? a.find("iframe").css({
            height: parseFloat(t.height) - f - c
        }) : r.css({
            height: parseFloat(t.height) - f - c - parseFloat(r.css("padding-top")) - parseFloat(r.css("padding-bottom"))
        }))
    },
    r.min = function(e, t) {
        var a = i("#" + s[0] + e),
        l = a.find(s[1]).outerHeight() || 0,
        f = a.attr("minLeft") || 181 * o.minIndex + "px",
        c = a.css("position");
        o.record(a),
        o.minLeft[0] && (f = o.minLeft[0], o.minLeft.shift()),
        a.attr("position", c),
        r.style(e, {
            width: 180,
            height: l,
            left: f,
            top: n.height() - l,
            position: "fixed",
            overflow: "hidden"
        },
        !0),
        a.find(".layui-layer-min").hide(),
        "page" === a.attr("type") && a.find(s[4]).hide(),
        o.rescollbar(e),
        a.attr("minLeft") || o.minIndex++,
        a.attr("minLeft", f)
    },
    r.restore = function(e) {
        var t = i("#" + s[0] + e),
        n = t.attr("area").split(",");
        t.attr("type");
        r.style(e, {
            width: parseFloat(n[0]),
            height: parseFloat(n[1]),
            top: parseFloat(n[2]),
            left: parseFloat(n[3]),
            position: t.attr("position"),
            overflow: "visible"
        },
        !0),
        t.find(".layui-layer-max").removeClass("layui-layer-maxmin"),
        t.find(".layui-layer-min").show(),
        "page" === t.attr("type") && t.find(s[4]).show(),
        o.rescollbar(e)
    },
    r.full = function(e) {
        var t, a = i("#" + s[0] + e);
        o.record(a),
        s.html.attr("layer-full") || s.html.css("overflow", "hidden").attr("layer-full", e),
        clearTimeout(t),
        t = setTimeout(function() {
            var t = "fixed" === a.css("position");
            r.style(e, {
                top: t ? 0 : n.scrollTop(),
                left: t ? 0 : n.scrollLeft(),
                width: n.width(),
                height: n.height()
            },
            !0),
            a.find(".layui-layer-min").hide()
        },
        100)
    },
    r.title = function(e, t) {
        var n = i("#" + s[0] + (t || r.index)).find(s[1]);
        n.html(e)
    },
    r.close = function(e) {
        var t = i("#" + s[0] + e),
        n = t.attr("type"),
        a = "layer-anim-close";
        if (t[0]) {
            var l = "layui-layer-wrap",
            f = function() {
                if (n === o.type[1] && "object" === t.attr("conType")) {
                    t.children(":not(." + s[5] + ")").remove();
                    for (var a = t.find("." + l), r = 0; r < 2; r++) a.unwrap();
                    a.css("display", a.data("display")).removeClass(l)
                } else {
                    if (n === o.type[2]) try {
                        var f = i("#" + s[4] + e)[0];
                        f.contentWindow.document.write(""),
                        f.contentWindow.close(),
                        t.find("." + s[5])[0].removeChild(f)
                    } catch(c) {}
                    t[0].innerHTML = "",
                    t.remove()
                }
            };
            t.data("anim") && t.addClass(a),
            i("#layui-layer-moves, #layui-layer-shade" + e).remove(),
            6 == r.ie && o.reselect(),
            o.rescollbar(e),
            "function" == typeof o.end[e] && o.end[e](),
            delete o.end[e],
            t.attr("minLeft") && (o.minIndex--, o.minLeft.push(t.attr("minLeft"))),
            setTimeout(function() {
                f()
            },
            r.ie && r.ie < 10 || !t.data("anim") ? 0 : 200)
        }
    },
    r.closeAll = function(e) {
        i.each(i("." + s[0]),
        function() {
            var t = i(this),
            n = e ? t.attr("type") === e: 1;
            n && r.close(t.attr("times")),
            n = null
        })
    };
    var f = r.cache || {},
    c = function(e) {
        return f.skin ? " " + f.skin + " " + f.skin + "-" + e: ""
    };
    r.prompt = function(e, t) {
        var a = "";
        if (e = e || {},
        "function" == typeof e && (t = e), e.area) {
            var o = e.area;
            a = 'style="width: ' + o[0] + "; height: " + o[1] + ';"',
            delete e.area
        }
        var l, s = 2 == e.formType ? '<textarea class="layui-layer-input"' + a + ">" + (e.value || "") + "</textarea>": function() {
            return '<input type="' + (1 == e.formType ? "password": "text") + '" class="layui-layer-input" value="' + (e.value || "") + '">'
        } ();
        return r.open(i.extend({
            type: 1,
            btn: ["&#x786E;&#x5B9A;", "&#x53D6;&#x6D88;"],
            content: s,
            skin: "layui-layer-prompt" + c("prompt"),
            maxWidth: n.width(),
            success: function(e) {
                l = e.find(".layui-layer-input"),
                l.focus()
            },
            resize: !1,
            yes: function(i) {
                var n = l.val();
                "" === n ? l.focus() : n.length > (e.maxlength || 500) ? r.tips("&#x6700;&#x591A;&#x8F93;&#x5165;" + (e.maxlength || 500) + "&#x4E2A;&#x5B57;&#x6570;", l, {
                    tips: 1
                }) : t && t(n, i, l)
            }
        },
        e))
    },
    r.tab = function(e) {
        e = e || {};
        var t = e.tab || {};
        return r.open(i.extend({
            type: 1,
            skin: "layui-layer-tab" + c("tab"),
            resize: !1,
            title: function() {
                var e = t.length,
                i = 1,
                n = "";
                if (e > 0) for (n = '<span class="layui-layer-tabnow">' + t[0].title + "</span>"; i < e; i++) n += "<span>" + t[i].title + "</span>";
                return n
            } (),
            content: '<ul class="layui-layer-tabmain">' +
            function() {
                var e = t.length,
                i = 1,
                n = "";
                if (e > 0) for (n = '<li class="layui-layer-tabli xubox_tab_layer">' + (t[0].content || "no content") + "</li>"; i < e; i++) n += '<li class="layui-layer-tabli">' + (t[i].content || "no  content") + "</li>";
                return n
            } () + "</ul>",
            success: function(t) {
                var n = t.find(".layui-layer-title").children(),
                a = t.find(".layui-layer-tabmain").children();
                n.on("mousedown",
                function(t) {
                    t.stopPropagation ? t.stopPropagation() : t.cancelBubble = !0;
                    var n = i(this),
                    o = n.index();
                    n.addClass("layui-layer-tabnow").siblings().removeClass("layui-layer-tabnow"),
                    a.eq(o).show().siblings().hide(),
                    "function" == typeof e.change && e.change(o)
                })
            }
        },
        e))
    },
    r.photos = function(t, n, a) {
        function o(e, t, i) {
            var n = new Image;
            return n.src = e,
            n.complete ? t(n) : (n.onload = function() {
                n.onload = null,
                t(n)
            },
            void(n.onerror = function(e) {
                n.onerror = null,
                i(e)
            }))
        }
        var l = {};
        if (t = t || {},
        t.photos) {
            var s = t.photos.constructor === Object,
            f = s ? t.photos: {},
            d = f.data || [],
            u = f.start || 0;
            if (l.imgIndex = (0 | u) + 1, t.img = t.img || "img", s) {
                if (0 === d.length) return r.msg("&#x6CA1;&#x6709;&#x56FE;&#x7247;")
            } else {
                var y = i(t.photos),
                p = function() {
                    d = [],
                    y.find(t.img).each(function(e) {
                        var t = i(this);
                        t.attr("layer-index", e),
                        d.push({
                            alt: t.attr("alt"),
                            pid: t.attr("layer-pid"),
                            src: t.attr("layer-src") || t.attr("src"),
                            thumb: t.attr("src")
                        })
                    })
                };
                if (p(), 0 === d.length) return;
                if (n || y.on("click", t.img,
                function() {
                    var e = i(this),
                    n = e.attr("layer-index");
                    r.photos(i.extend(t, {
                        photos: {
                            start: n,
                            data: d,
                            tab: t.tab
                        },
                        full: t.full
                    }), !0),
                    p()
                }), !n) return
            }
            l.imgprev = function(e) {
                l.imgIndex--,
                l.imgIndex < 1 && (l.imgIndex = d.length),
                l.tabimg(e)
            },
            l.imgnext = function(e, t) {
                l.imgIndex++,
                l.imgIndex > d.length && (l.imgIndex = 1, t) || l.tabimg(e)
            },
            l.keyup = function(e) {
                if (!l.end) {
                    var t = e.keyCode;
                    e.preventDefault(),
                    37 === t ? l.imgprev(!0) : 39 === t ? l.imgnext(!0) : 27 === t && r.close(l.index)
                }
            },
            l.tabimg = function(e) {
                d.length <= 1 || (f.start = l.imgIndex - 1, r.close(l.index), r.photos(t, !0, e))
            },
            l.event = function() {
                l.bigimg.hover(function() {
                    l.imgsee.show()
                },
                function() {
                    l.imgsee.hide()
                }),
                l.bigimg.find(".layui-layer-imgprev").on("click",
                function(e) {
                    e.preventDefault(),
                    l.imgprev()
                }),
                l.bigimg.find(".layui-layer-imgnext").on("click",
                function(e) {
                    e.preventDefault(),
                    l.imgnext()
                }),
                i(document).on("keyup", l.keyup)
            },
            l.loadi = r.load(1, {
                shade: !("shade" in t) && .9,
                scrollbar: !1
            }),
            o(d[u].src,
            function(n) {
                r.close(l.loadi),
                l.index = r.open(i.extend({
                    type: 1,
                    area: function() {
                        var a = [n.width, n.height],
                        o = [i(e).width() - 100, i(e).height() - 100];
                        if (!t.full && (a[0] > o[0] || a[1] > o[1])) {
                            var r = [a[0] / o[0], a[1] / o[1]];
                            r[0] > r[1] ? (a[0] = a[0] / r[0], a[1] = a[1] / r[0]) : r[0] < r[1] && (a[0] = a[0] / r[1], a[1] = a[1] / r[1])
                        }
                        return [a[0] + "px", a[1] + "px"]
                    } (),
                    title: !1,
                    shade: .9,
                    shadeClose: !0,
                    closeBtn: !1,
                    move: ".layui-layer-phimg img",
                    moveType: 1,
                    scrollbar: !1,
                    moveOut: !0,
                    anim: 5 * Math.random() | 0,
                    skin: "layui-layer-photos" + c("photos"),
                    content: '<div class="layui-layer-phimg"><img src="' + d[u].src + '" alt="' + (d[u].alt || "") + '" layer-pid="' + d[u].pid + '"><div class="layui-layer-imgsee">' + (d.length > 1 ? '<span class="layui-layer-imguide"><a href="javascript:;" class="layui-layer-iconext layui-layer-imgprev"></a><a href="javascript:;" class="layui-layer-iconext layui-layer-imgnext"></a></span>': "") + '<div class="layui-layer-imgbar" style="display:' + (a ? "block": "") + '"><span class="layui-layer-imgtit"><a href="javascript:;">' + (d[u].alt || "") + "</a><em>" + l.imgIndex + "/" + d.length + "</em></span></div></div></div>",
                    success: function(e, i) {
                        l.bigimg = e.find(".layui-layer-phimg"),
                        l.imgsee = e.find(".layui-layer-imguide,.layui-layer-imgbar"),
                        l.event(e),
                        t.tab && t.tab(d[u], e)
                    },
                    end: function() {
                        l.end = !0,
                        i(document).off("keyup", l.keyup)
                    }
                },
                t))
            },
            function() {
                r.close(l.loadi),
                r.msg("&#x5F53;&#x524D;&#x56FE;&#x7247;&#x5730;&#x5740;&#x5F02;&#x5E38;<br>&#x662F;&#x5426;&#x7EE7;&#x7EED;&#x67E5;&#x770B;&#x4E0B;&#x4E00;&#x5F20;&#xFF1F;", {
                    time: 3e4,
                    btn: ["&#x4E0B;&#x4E00;&#x5F20;", "&#x4E0D;&#x770B;&#x4E86;"],
                    yes: function() {
                        d.length > 1 && l.imgnext(!0, !0)
                    }
                })
            })
        }
    },
    o.run = function(t) {
        i = t,
        n = i(e),
        s.html = i("html"),
        r.open = function(e) {
            var t = new l(e);
            return t.index
        }
    },
    e.layui && layui.define ? (r.ready(), layui.define("jquery",
    function(t) {
        r.path = layui.cache.dir,
        o.run(layui.jquery),
        e.layer = r,
        t("layer", r)
    })) : "function" == typeof define ? define(["jquery"],
    function() {
        return o.run(e.jQuery),
        r
    }) : function() {
        o.run(e.jQuery),
        r.ready()
    } ()
} (window);
/* @Name : layDate v1.1 日期控件 */
; !
function(a) {
    var b = {
        path: "",
        defSkin: "default",
        format: "YYYY-MM-DD",
        min: "1900-01-01 00:00:00",
        max: "2099-12-31 23:59:59",
        isv: !1
    },
    c = {},
    d = document,
    e = "createElement",
    f = "getElementById",
    g = "getElementsByTagName",
    h = ["laydate_box", "laydate_void", "laydate_click", "LayDateSkin", "skins/", "/laydate.css"];
    a.laydate = function(b) {
        b = b || {};
        try {
            h.event = a.event ? a.event: laydate.caller.arguments[0]
        } catch(d) {}
        return c.run(b),
        laydate
    },
    laydate.v = "1.1",
    c.getPath = function() {
        var a = document.scripts,
        c = a[a.length - 1].src;
        return b.path ? b.path: c.substring(0, c.lastIndexOf("/") + 1)
    } (),
    c.use = function(a, b) {
        var f = d[e]("link");
        f.type = "text/css",
        f.rel = "stylesheet",
        f.href = c.getPath + a + h[5],
        b && (f.id = b),
        d[g]("head")[0].appendChild(f),
        f = null
    },
    c.trim = function(a) {
        return a = a || "",
        a.replace(/^\s|\s$/g, "").replace(/\s+/g, " ")
    },
    c.digit = function(a) {
        return 10 > a ? "0" + (0 | a) : a
    },
    c.stopmp = function(b) {
        return b = b || a.event,
        b.stopPropagation ? b.stopPropagation() : b.cancelBubble = !0,
        this
    },
    c.each = function(a, b) {
        for (var c = 0,
        d = a.length; d > c && b(c, a[c]) !== !1; c++);
    },
    c.hasClass = function(a, b) {
        return a = a || {},
        new RegExp("\\b" + b + "\\b").test(a.className)
    },
    c.addClass = function(a, b) {
        return a = a || {},
        c.hasClass(a, b) || (a.className += " " + b),
        a.className = c.trim(a.className),
        this
    },
    c.removeClass = function(a, b) {
        if (a = a || {},
        c.hasClass(a, b)) {
            var d = new RegExp("\\b" + b + "\\b");
            a.className = a.className.replace(d, "")
        }
        return this
    },
    c.removeCssAttr = function(a, b) {
        var c = a.style;
        c.removeProperty ? c.removeProperty(b) : c.removeAttribute(b)
    },
    c.shde = function(a, b) {
        a.style.display = b ? "none": "block"
    },
    c.query = function(a) {
        var e, b, h, i, j;
        return a = c.trim(a).split(" "),
        b = d[f](a[0].substr(1)),
        b ? a[1] ? /^\./.test(a[1]) ? (i = a[1].substr(1), j = new RegExp("\\b" + i + "\\b"), e = [], h = d.getElementsByClassName ? b.getElementsByClassName(i) : b[g]("*"), c.each(h,
        function(a, b) {
            j.test(b.className) && e.push(b)
        }), e[0] ? e: "") : (e = b[g](a[1]), e[0] ? b[g](a[1]) : "") : b: void 0
    },
    c.on = function(b, d, e) {
        return b.attachEvent ? b.attachEvent("on" + d,
        function() {
            e.call(b, a.even)
        }) : b.addEventListener(d, e, !1),
        c
    },
    c.stopMosup = function(a, b) {
        "mouseup" !== a && c.on(b, "mouseup",
        function(a) {
            c.stopmp(a)
        })
    },
    c.run = function(a) {
        var d, e, g, b = c.query,
        f = h.event;
        try {
            g = f.target || f.srcElement || {}
        } catch(i) {
            g = {}
        }
        if (d = a.elem ? b(a.elem) : g, f && g.tagName) {
            if (!d || d === c.elem) return;
            c.stopMosup(f.type, d),
            c.stopmp(f),
            c.view(d, a),
            c.reshow()
        } else e = a.event || "click",
        c.each((0 | d.length) > 0 ? d: [d],
        function(b, d) {
            c.stopMosup(e, d),
            c.on(d, e,
            function(b) {
                c.stopmp(b),
                d !== c.elem && (c.view(d, a), c.reshow())
            })
        })
    },
    c.scroll = function(a) {
        return a = a ? "scrollLeft": "scrollTop",
        d.body[a] | d.documentElement[a]
    },
    c.winarea = function(a) {
        return document.documentElement[a ? "clientWidth": "clientHeight"]
    },
    c.isleap = function(a) {
        return 0 === a % 4 && 0 !== a % 100 || 0 === a % 400
    },
    c.checkVoid = function(a, b, d) {
        var e = [];
        return a = 0 | a,
        b = 0 | b,
        d = 0 | d,
        a < c.mins[0] ? e = ["y"] : a > c.maxs[0] ? e = ["y", 1] : a >= c.mins[0] && a <= c.maxs[0] && (a == c.mins[0] && (b < c.mins[1] ? e = ["m"] : b == c.mins[1] && d < c.mins[2] && (e = ["d"])), a == c.maxs[0] && (b > c.maxs[1] ? e = ["m", 1] : b == c.maxs[1] && d > c.maxs[2] && (e = ["d", 1]))),
        e
    },
    c.timeVoid = function(a, b) {
        if (c.ymd[1] + 1 == c.mins[1] && c.ymd[2] == c.mins[2]) {
            if (0 === b && a < c.mins[3]) return 1;
            if (1 === b && a < c.mins[4]) return 1;
            if (2 === b && a < c.mins[5]) return 1
        } else if (c.ymd[1] + 1 == c.maxs[1] && c.ymd[2] == c.maxs[2]) {
            if (0 === b && a > c.maxs[3]) return 1;
            if (1 === b && a > c.maxs[4]) return 1;
            if (2 === b && a > c.maxs[5]) return 1
        }
        return a > (b ? 59 : 23) ? 1 : void 0
    },
    c.check = function() {
        var a = c.options.format.replace(/YYYY|MM|DD|hh|mm|ss/g, "\\d+\\").replace(/\\$/g, ""),
        b = new RegExp(a),
        d = c.elem[h.elemv],
        e = d.match(/\d+/g) || [],
        f = c.checkVoid(e[0], e[1], e[2]);
        if ("" !== d.replace(/\s/g, "")) {
            if (!b.test(d)) return c.elem[h.elemv] = "",
            c.msg("日期不符合格式，请重新选择。"),
            1;
            if (f[0]) return c.elem[h.elemv] = "",
            c.msg("日期不在有效期内，请重新选择。"),
            1;
            f.value = c.elem[h.elemv].match(b).join(),
            e = f.value.match(/\d+/g),
            e[1] < 1 ? (e[1] = 1, f.auto = 1) : e[1] > 12 ? (e[1] = 12, f.auto = 1) : e[1].length < 2 && (f.auto = 1),
            e[2] < 1 ? (e[2] = 1, f.auto = 1) : e[2] > c.months[(0 | e[1]) - 1] ? (e[2] = 31, f.auto = 1) : e[2].length < 2 && (f.auto = 1),
            e.length > 3 && (c.timeVoid(e[3], 0) && (f.auto = 1), c.timeVoid(e[4], 1) && (f.auto = 1), c.timeVoid(e[5], 2) && (f.auto = 1)),
            f.auto ? c.creation([e[0], 0 | e[1], 0 | e[2]], 1) : f.value !== c.elem[h.elemv] && (c.elem[h.elemv] = f.value)
        }
    },
    c.months = [31, null, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    c.viewDate = function(a, b, d) {
        var f = (c.query, {}),
        g = new Date;
        a < (0 | c.mins[0]) && (a = 0 | c.mins[0]),
        a > (0 | c.maxs[0]) && (a = 0 | c.maxs[0]),
        g.setFullYear(a, b, d),
        f.ymd = [g.getFullYear(), g.getMonth(), g.getDate()],
        c.months[1] = c.isleap(f.ymd[0]) ? 29 : 28,
        g.setFullYear(f.ymd[0], f.ymd[1], 1),
        f.FDay = g.getDay(),
        f.PDay = c.months[0 === b ? 11 : b - 1] - f.FDay + 1,
        f.NDay = 1,
        c.each(h.tds,
        function(a, b) {
            var g, d = f.ymd[0],
            e = f.ymd[1] + 1;
            b.className = "",
            a < f.FDay ? (b.innerHTML = g = a + f.PDay, c.addClass(b, "laydate_nothis"), 1 === e && (d -= 1), e = 1 === e ? 12 : e - 1) : a >= f.FDay && a < f.FDay + c.months[f.ymd[1]] ? (b.innerHTML = g = a - f.FDay + 1, a - f.FDay + 1 === f.ymd[2] && (c.addClass(b, h[2]), f.thisDay = b)) : (b.innerHTML = g = f.NDay++, c.addClass(b, "laydate_nothis"), 12 === e && (d += 1), e = 12 === e ? 1 : e + 1),
            c.checkVoid(d, e, g)[0] && c.addClass(b, h[1]),
            c.options.festival && c.festival(b, e + "." + g),
            b.setAttribute("y", d),
            b.setAttribute("m", e),
            b.setAttribute("d", g),
            d = e = g = null
        }),
        c.valid = !c.hasClass(f.thisDay, h[1]),
        c.ymd = f.ymd,
        h.year.value = c.ymd[0] + "年",
        h.month.value = c.digit(c.ymd[1] + 1) + "月",
        c.each(h.mms,
        function(a, b) {
            var d = c.checkVoid(c.ymd[0], (0 | b.getAttribute("m")) + 1);
            "y" === d[0] || "m" === d[0] ? c.addClass(b, h[1]) : c.removeClass(b, h[1]),
            c.removeClass(b, h[2]),
            d = null
        }),
        c.addClass(h.mms[c.ymd[1]], h[2]),
        f.times = [0 | c.inymd[3] || 0, 0 | c.inymd[4] || 0, 0 | c.inymd[5] || 0],
        c.each(new Array(3),
        function(a) {
            c.hmsin[a].value = c.digit(c.timeVoid(f.times[a], a) ? 0 | c.mins[a + 3] : 0 | f.times[a])
        }),
        c[c.valid ? "removeClass": "addClass"](h.ok, h[1])
    },
    c.festival = function(a, b) {
        var c;
        switch (b) {
        case "1.1":
            c = "元旦";
            break;
        case "3.8":
            c = "妇女";
            break;
        case "4.5":
            c = "清明";
            break;
        case "5.1":
            c = "劳动";
            break;
        case "6.1":
            c = "儿童";
            break;
        case "9.10":
            c = "教师";
            break;
        case "10.1":
            c = "国庆"
        }
        c && (a.innerHTML = c),
        c = null
    },
    c.viewYears = function(a) {
        var b = c.query,
        d = "";
        c.each(new Array(14),
        function(b) {
            d += 7 === b ? "<li " + (parseInt(h.year.value) === a ? 'class="' + h[2] + '"': "") + ' y="' + a + '">' + a + "年</li>": '<li y="' + (a - 7 + b) + '">' + (a - 7 + b) + "年</li>"
        }),
        b("#laydate_ys").innerHTML = d,
        c.each(b("#laydate_ys li"),
        function(a, b) {
            "y" === c.checkVoid(b.getAttribute("y"))[0] ? c.addClass(b, h[1]) : c.on(b, "click",
            function(a) {
                c.stopmp(a).reshow(),
                c.viewDate(0 | this.getAttribute("y"), c.ymd[1], c.ymd[2])
            })
        })
    },
    c.initDate = function() {
        var d = (c.query, new Date),
        e = c.elem[h.elemv].match(/\d+/g) || [];
        e.length < 3 && (e = c.options.start.match(/\d+/g) || [], e.length < 3 && (e = [d.getFullYear(), d.getMonth() + 1, d.getDate()])),
        c.inymd = e,
        c.viewDate(e[0], e[1] - 1, e[2])
    },
    c.iswrite = function() {
        var a = c.query,
        b = {
            time: a("#laydate_hms")
        };
        c.shde(b.time, !c.options.istime),
        c.shde(h.oclear, !("isclear" in c.options ? c.options.isclear: 1)),
        c.shde(h.otoday, !("istoday" in c.options ? c.options.istoday: 1)),
        c.shde(h.ok, !("issure" in c.options ? c.options.issure: 1))
    },
    c.orien = function(a, b) {
        var d, e = c.elem.getBoundingClientRect();
        a.style.left = e.left + (b ? 0 : c.scroll(1)) + "px",
        d = e.bottom + a.offsetHeight / 1.5 <= c.winarea() ? e.bottom - 1 : e.top > a.offsetHeight / 1.5 ? e.top - a.offsetHeight + 1 : c.winarea() - a.offsetHeight,
        a.style.top = d + (b ? 0 : c.scroll()) + "px"
    },
    c.follow = function(a) {
        c.options.fixed ? (a.style.position = "fixed", c.orien(a, 1)) : (a.style.position = "absolute", c.orien(a))
    },
    c.viewtb = function() {
        var a, b = [],
        f = ["日", "一", "二", "三", "四", "五", "六"],
        h = {},
        i = d[e]("table"),
        j = d[e]("thead");
        return j.appendChild(d[e]("tr")),
        h.creath = function(a) {
            var b = d[e]("th");
            b.innerHTML = f[a],
            j[g]("tr")[0].appendChild(b),
            b = null
        },
        c.each(new Array(6),
        function(d) {
            b.push([]),
            a = i.insertRow(0),
            c.each(new Array(7),
            function(c) {
                b[d][c] = 0,
                0 === d && h.creath(c),
                a.insertCell(c)
            })
        }),
        i.insertBefore(j, i.children[0]),
        i.id = i.className = "laydate_table",
        a = b = null,
        i.outerHTML.toLowerCase()
    } (),
    c.view = function(a, f) {
        var i, g = c.query,
        j = {};
        f = f || a,
        c.elem = a,
        c.options = f,
        c.options.format || (c.options.format = b.format),
        c.options.start = c.options.start || "",
        c.mm = j.mm = [c.options.min || b.min, c.options.max || b.max],
        c.mins = j.mm[0].match(/\d+/g),
        c.maxs = j.mm[1].match(/\d+/g),
        h.elemv = /textarea|input/.test(c.elem.tagName.toLocaleLowerCase()) ? "value": "innerHTML",
        c.box ? c.shde(c.box) : (i = d[e]("div"), i.id = h[0], i.className = h[0], i.style.cssText = "position: absolute;", i.setAttribute("name", "laydate-v" + laydate.v), i.innerHTML = j.html = '<div class="laydate_top"><div class="laydate_ym laydate_y" id="laydate_YY"><a class="laydate_choose laydate_chprev laydate_tab"><cite></cite></a><input id="laydate_y" readonly><label></label><a class="laydate_choose laydate_chnext laydate_tab"><cite></cite></a><div class="laydate_yms"><a class="laydate_tab laydate_chtop"><cite></cite></a><ul id="laydate_ys"></ul><a class="laydate_tab laydate_chdown"><cite></cite></a></div></div><div class="laydate_ym laydate_m" id="laydate_MM"><a class="laydate_choose laydate_chprev laydate_tab"><cite></cite></a><input id="laydate_m" readonly><label></label><a class="laydate_choose laydate_chnext laydate_tab"><cite></cite></a><div class="laydate_yms" id="laydate_ms">' +
        function() {
            var a = "";
            return c.each(new Array(12),
            function(b) {
                a += '<span m="' + b + '">' + c.digit(b + 1) + "月</span>"
            }),
            a
        } () + "</div>" + "</div>" + "</div>" + c.viewtb + '<div class="laydate_bottom">' + '<ul id="laydate_hms">' + '<li class="laydate_sj">时间</li>' + "<li><input readonly>:</li>" + "<li><input readonly>:</li>" + "<li><input readonly></li>" + "</ul>" + '<div class="laydate_time" id="laydate_time"></div>' + '<div class="laydate_btn">' + '<a id="laydate_clear">清空</a>' + '<a id="laydate_today">今天</a>' + '<a id="laydate_ok">确认</a>' + "</div>" + (b.isv ? '<a href="http://sentsin.com/layui/laydate/" class="laydate_v" target="_blank">laydate-v' + laydate.v + "</a>": "") + "</div>", d.body.appendChild(i), c.box = g("#" + h[0]), c.events(), i = null),
        c.follow(c.box),
        f.zIndex ? c.box.style.zIndex = f.zIndex: c.removeCssAttr(c.box, "z-index"),
        c.stopMosup("click", c.box),
        c.initDate(),
        c.iswrite(),
        c.check()
    },
    c.reshow = function() {
        return c.each(c.query("#" + h[0] + " .laydate_show"),
        function(a, b) {
            c.removeClass(b, "laydate_show")
        }),
        this
    },
    c.close = function() {
        c.reshow(),
        c.shde(c.query("#" + h[0]), 1),
        c.elem = null
    },
    c.parse = function(a, d, e) {
        return a = a.concat(d),
        e = e || (c.options ? c.options.format: b.format),
        e.replace(/YYYY|MM|DD|hh|mm|ss/g,
        function() {
            return a.index = 0 | ++a.index,
            c.digit(a[a.index])
        })
    },
    c.creation = function(a, b) {
        var e = (c.query, c.hmsin),
        f = c.parse(a, [e[0].value, e[1].value, e[2].value]);
        c.elem[h.elemv] = f,
        b || (c.close(), "function" == typeof c.options.choose && c.options.choose(f))
    },
    c.events = function() {
        var b = c.query,
        e = {
            box: "#" + h[0]
        };
        c.addClass(d.body, "laydate_body"),
        h.tds = b("#laydate_table td"),
        h.mms = b("#laydate_ms span"),
        h.year = b("#laydate_y"),
        h.month = b("#laydate_m"),
        c.each(b(e.box + " .laydate_ym"),
        function(a, b) {
            c.on(b, "click",
            function(b) {
                c.stopmp(b).reshow(),
                c.addClass(this[g]("div")[0], "laydate_show"),
                a || (e.YY = parseInt(h.year.value), c.viewYears(e.YY))
            })
        }),
        c.on(b(e.box), "click",
        function() {
            c.reshow()
        }),
        e.tabYear = function(a) {
            0 === a ? c.ymd[0]--:1 === a ? c.ymd[0]++:2 === a ? e.YY -= 14 : e.YY += 14,
            2 > a ? (c.viewDate(c.ymd[0], c.ymd[1], c.ymd[2]), c.reshow()) : c.viewYears(e.YY)
        },
        c.each(b("#laydate_YY .laydate_tab"),
        function(a, b) {
            c.on(b, "click",
            function(b) {
                c.stopmp(b),
                e.tabYear(a)
            })
        }),
        e.tabMonth = function(a) {
            a ? (c.ymd[1]++, 12 === c.ymd[1] && (c.ymd[0]++, c.ymd[1] = 0)) : (c.ymd[1]--, -1 === c.ymd[1] && (c.ymd[0]--, c.ymd[1] = 11)),
            c.viewDate(c.ymd[0], c.ymd[1], c.ymd[2])
        },
        c.each(b("#laydate_MM .laydate_tab"),
        function(a, b) {
            c.on(b, "click",
            function(b) {
                c.stopmp(b).reshow(),
                e.tabMonth(a)
            })
        }),
        c.each(b("#laydate_ms span"),
        function(a, b) {
            c.on(b, "click",
            function(a) {
                c.stopmp(a).reshow(),
                c.hasClass(this, h[1]) || c.viewDate(c.ymd[0], 0 | this.getAttribute("m"), c.ymd[2])
            })
        }),
        c.each(b("#laydate_table td"),
        function(a, b) {
            c.on(b, "click",
            function(a) {
                c.hasClass(this, h[1]) || (c.stopmp(a), c.creation([0 | this.getAttribute("y"), 0 | this.getAttribute("m"), 0 | this.getAttribute("d")]))
            })
        }),
        h.oclear = b("#laydate_clear"),
        c.on(h.oclear, "click",
        function() {
            c.elem[h.elemv] = "",
            c.close()
        }),
        h.otoday = b("#laydate_today"),
        c.on(h.otoday, "click",
        function() {
            c.elem[h.elemv] = laydate.now(0, c.options.format),
            c.close()
        }),
        h.ok = b("#laydate_ok"),
        c.on(h.ok, "click",
        function() {
            c.valid && c.creation([c.ymd[0], c.ymd[1] + 1, c.ymd[2]])
        }),
        e.times = b("#laydate_time"),
        c.hmsin = e.hmsin = b("#laydate_hms input"),
        e.hmss = ["小时", "分钟", "秒数"],
        e.hmsarr = [],
        c.msg = function(a, d) {
            var f = '<div class="laydte_hsmtex">' + (d || "提示") + "<span>×</span></div>";
            "string" == typeof a ? (f += "<p>" + a + "</p>", c.shde(b("#" + h[0])), c.removeClass(e.times, "laydate_time1").addClass(e.times, "laydate_msg")) : (e.hmsarr[a] ? f = e.hmsarr[a] : (f += '<div id="laydate_hmsno" class="laydate_hmsno">', c.each(new Array(0 === a ? 24 : 60),
            function(a) {
                f += "<span>" + a + "</span>"
            }), f += "</div>", e.hmsarr[a] = f), c.removeClass(e.times, "laydate_msg"), c[0 === a ? "removeClass": "addClass"](e.times, "laydate_time1")),
            c.addClass(e.times, "laydate_show"),
            e.times.innerHTML = f
        },
        e.hmson = function(a, d) {
            var e = b("#laydate_hmsno span"),
            f = c.valid ? null: 1;
            c.each(e,
            function(b, e) {
                f ? c.addClass(e, h[1]) : c.timeVoid(b, d) ? c.addClass(e, h[1]) : c.on(e, "click",
                function() {
                    c.hasClass(this, h[1]) || (a.value = c.digit(0 | this.innerHTML))
                })
            }),
            c.addClass(e[0 | a.value], "laydate_click")
        },
        c.each(e.hmsin,
        function(a, b) {
            c.on(b, "click",
            function(b) {
                c.stopmp(b).reshow(),
                c.msg(a, e.hmss[a]),
                e.hmson(this, a)
            })
        }),
        c.on(d, "mouseup",
        function() {
            var a = b("#" + h[0]);
            a && "none" !== a.style.display && (c.check() || c.close())
        }).on(d, "keydown",
        function(b) {
            b = b || a.event;
            var d = b.keyCode;
            13 === d && c.creation([c.ymd[0], c.ymd[1] + 1, c.ymd[2]])
        })
    },
    c.init = function() {
        c.use("need"),
        c.use(h[4] + b.defSkin, h[3]),
        c.skinLink = c.query("#" + h[3])
    } (),
    laydate.reset = function() {
        c.box && c.elem && c.follow(c.box)
    },
    laydate.now = function(a, b) {
        var d = new Date(0 | a ?
        function(a) {
            return 864e5 > a ? +new Date + 864e5 * a: a
        } (parseInt(a)) : +new Date);
        return c.parse([d.getFullYear(), d.getMonth() + 1, d.getDate()], [d.getHours(), d.getMinutes(), d.getSeconds()], b)
    },
    laydate.skin = function(a) {
        c.skinLink.href = c.getPath + h[4] + a + h[5]
    }
} (window);
/*! layPage-v1.3.0 分页组件 */
; !
function() {
    "use strict";
    function a(d) {
        var e = "laypagecss";
        a.dir = "dir" in a ? a.dir: f.getpath + "/skin/laypage.css",
        new f(d),
        a.dir && !b[c](e) && f.use(a.dir, e)
    }
    a.v = "1.3";
    var b = document,
    c = "getElementById",
    d = "getElementsByTagName",
    e = 0,
    f = function(a) {
        var b = this,
        c = b.config = a || {};
        c.item = e++,
        b.render(!0)
    };
    f.on = function(a, b, c) {
        return a.attachEvent ? a.attachEvent("on" + b,
        function() {
            c.call(a, window.even)
        }) : a.addEventListener(b, c, !1),
        f
    },
    f.getpath = function() {
        var a = document.scripts,
        b = a[a.length - 1].src;
        return b.substring(0, b.lastIndexOf("/") + 1)
    } (),
    f.use = function(c, e) {
        var f = b.createElement("link");
        f.type = "text/css",
        f.rel = "stylesheet",
        f.href = a.dir,
        e && (f.id = e),
        b[d]("head")[0].appendChild(f),
        f = null
    },
    f.prototype.type = function() {
        var a = this.config;
        return "object" == typeof a.cont ? void 0 === a.cont.length ? 2 : 3 : void 0
    },
    f.prototype.view = function() {
        var b = this,
        c = b.config,
        d = [],
        e = {};
        if (c.pages = 0 | c.pages, c.curr = 0 | c.curr || 1, c.groups = "groups" in c ? 0 | c.groups: 5, c.first = "first" in c ? c.first: "&#x9996;&#x9875;", c.last = "last" in c ? c.last: "&#x5C3E;&#x9875;", c.prev = "prev" in c ? c.prev: "&#x4E0A;&#x4E00;&#x9875;", c.next = "next" in c ? c.next: "&#x4E0B;&#x4E00;&#x9875;", c.pages <= 1) return "";
        for (c.groups > c.pages && (c.groups = c.pages), e.index = Math.ceil((c.curr + (c.groups > 1 && c.groups !== c.pages ? 1 : 0)) / (0 === c.groups ? 1 : c.groups)), c.curr > 1 && c.prev && d.push('<a href="javascript:;" class="laypage_prev" data-page="' + (c.curr - 1) + '">' + c.prev + "</a>"), e.index > 1 && c.first && 0 !== c.groups && d.push('<a href="javascript:;" class="laypage_first" data-page="1"  title="&#x9996;&#x9875;">' + c.first + "</a><span>&#x2026;</span>"), e.poor = Math.floor((c.groups - 1) / 2), e.start = e.index > 1 ? c.curr - e.poor: 1, e.end = e.index > 1 ?
        function() {
            var a = c.curr + (c.groups - e.poor - 1);
            return a > c.pages ? c.pages: a
        } () : c.groups, e.end - e.start < c.groups - 1 && (e.start = e.end - c.groups + 1); e.start <= e.end; e.start++) e.start === c.curr ? d.push('<span class="laypage_curr" ' + (/^#/.test(c.skin) ? 'style="background-color:' + c.skin + '"': "") + ">" + e.start + "</span>") : d.push('<a href="javascript:;" data-page="' + e.start + '">' + e.start + "</a>");
        return c.pages > c.groups && e.end < c.pages && c.last && 0 !== c.groups && d.push('<span>&#x2026;</span><a href="javascript:;" class="laypage_last" title="&#x5C3E;&#x9875;"  data-page="' + c.pages + '">' + c.last + "</a>"),
        e.flow = !c.prev && 0 === c.groups,
        (c.curr !== c.pages && c.next || e.flow) && d.push(function() {
            return e.flow && c.curr === c.pages ? '<span class="page_nomore" title="&#x5DF2;&#x6CA1;&#x6709;&#x66F4;&#x591A;">' + c.next + "</span>": '<a href="javascript:;" class="laypage_next" data-page="' + (c.curr + 1) + '">' + c.next + "</a>"
        } ()),
        '<div name="laypage' + a.v + '" class="laypage_main laypageskin_' + (c.skin ?
        function(a) {
            return /^#/.test(a) ? "molv": a
        } (c.skin) : "default") + '" id="laypage_' + b.config.item + '">' + d.join("") +
        function() {
            return c.skip ? '<span class="laypage_total"><label>&#x5230;&#x7B2C;</label><input type="number" min="1" onkeyup="this.value=this.value.replace(/\\D/, \'\');" class="laypage_skip"><label>&#x9875;</label><button type="button" class="laypage_btn">&#x786e;&#x5b9a;</button></span>': ""
        } () + "</div>"
    },
    f.prototype.jump = function(a) {
        if (a) {
            for (var b = this,
            c = b.config,
            e = a.children,
            g = a[d]("button")[0], h = a[d]("input")[0], i = 0, j = e.length; j > i; i++)"a" === e[i].nodeName.toLowerCase() && f.on(e[i], "click",
            function() {
                var a = 0 | this.getAttribute("data-page");
                c.curr = a,
                b.render()
            });
            g && f.on(g, "click",
            function() {
                var a = 0 | h.value.replace(/\s|\D/g, "");
                a && a <= c.pages && (c.curr = a, b.render())
            })
        }
    },
    f.prototype.render = function(a) {
        var d = this,
        e = d.config,
        f = d.type(),
        g = d.view();
        2 === f ? e.cont.innerHTML = g: 3 === f ? e.cont.html(g) : b[c](e.cont).innerHTML = g,
        e.jump && e.jump(e, a),
        d.jump(b[c]("laypage_" + e.item)),
        e.hash && !a && (location.hash = "!" + e.hash + "=" + e.curr)
    },
    "function" == typeof define ? define(function() {
        return a
    }) : "undefined" != typeof exports ? module.exports = a: window.laypage = a
} ();