// Livestamp.js / v1.1.2 / (c) 2014 Matt Bradley / MIT License
(function (plugin) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery', 'moment'], plugin);
  } else {
    // Browser globals
    plugin(jQuery, moment);
  }
}(function($, moment) {
  var updateInterval = 1e3,
      useNativeTimestamps = false,
      formatters = {},
      paused = false,
      updateID = null,
      $livestamps = $([]),

  init = function() {
    livestampGlobal.resume();
  },

  prep = function($el, timestamp, format) {
    var oldData = $el.data('livestampdata');
    if ((typeof timestamp === 'number') && !useNativeTimestamps)
      timestamp *= 1e3;

    $el.removeAttr('data-livestamp')
      .removeData('livestamp')
      .removeAttr('data-livestamp-format')
      .removeData('livestamp-format');

    timestamp = moment(timestamp);
    if (moment.isMoment(timestamp) && !isNaN(+timestamp)) {
      var newData = $.extend({ }, {'original': $el.contents() }, oldData);
      newData.moment = moment(timestamp);
      newData.format = format;

      $el.data('livestampdata', newData).empty();
      if ($.inArray($el[0], $livestamps) === -1) {
        $livestamps.push($el[0]);
      }
    }
  },

  run = function() {
    if (paused) return;
    livestampGlobal.update();
  },

  livestampGlobal = {
    update: function() {
      // Clear any timeout in case we're called before it fires.
      clearTimeout(updateID);
      // Schedule the next update if appropriate.
      if (!paused) {
        updateID = setTimeout(run, updateInterval);
      }

      $('[data-livestamp]').each(function() {
        var $this = $(this);
        prep($this, $this.data('livestamp'), $this.data('livestamp-format'));
      });

      var toRemove = [];
      $livestamps.each(function() {
        var $this = $(this),
            data = $this.data('livestampdata');

        if (data === undefined)
          toRemove.push(this);
        else if (moment.isMoment(data.moment)) {
          var formatter = formatters[data.format];
          var from = $this.html(),
              to = formatter ? formatter(data.moment) : data.moment.fromNow();

          if (from != to) {
            var e = $.Event('change.livestamp');
            $this.trigger(e, [from, to]);
            if (!e.isDefaultPrevented())
              $this.html(to);
          }
        }
      });

      $livestamps = $livestamps.not(toRemove);
      delete $livestamps.prevObject
    },

    pause: function() {
      paused = true;
    },

    resume: function() {
      paused = false;
      run();
    },

    interval: function(interval) {
      if (interval === undefined)
        return updateInterval;
      updateInterval = interval;
    },

    nativeTimestamps: function(nativeTimestamps) {
      if (nativeTimestamps === undefined) {
        return useNativeTimestamps;
      }
      useNativeTimestamps = nativeTimestamps;
    },

    registerFormatter: function(name, fn) {
      formatters[name] = fn;
    }
  },

  livestampLocal = {
    add: function($el, timestamp, format) {
      if ((typeof timestamp === 'number') && !useNativeTimestamps)
        timestamp *= 1e3;
      timestamp = moment(timestamp);

      if (moment.isMoment(timestamp) && !isNaN(+timestamp)) {
        $el.each(function() {
          prep($(this), timestamp, format);
        });
        livestampGlobal.update();
      }

      return $el;
    },

    destroy: function($el) {
      $livestamps = $livestamps.not($el);
      $el.each(function() {
        var $this = $(this),
            data = $this.data('livestampdata');

        if (data === undefined)
          return $el;

        $this
          .html(data.original ? data.original : '')
          .removeData('livestampdata');
      });

      return $el;
    },

    isLivestamp: function($el) {
      return $el.data('livestampdata') !== undefined;
    }
  };

  $.livestamp = livestampGlobal;
  $(init);
  $.fn.livestamp = function(method, arg1 /* arg2, ... */) {
    var args = [].slice.call(arguments);
    method = args[0];

    if (livestampLocal[method]) {
      // Pop the method off.
      args.shift();
    } else {
      // The method was not specified. Default to 'add'.
      method = 'add';
    }

    // Pass the `$el` as the first argument to all local methods.
    args.unshift(this);

    return livestampLocal[method].apply(null, args);
  };
}));
