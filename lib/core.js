// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get, set = SC.set, getPath = SC.getPath;

SC.isEnumerable = function(content) {
  return get(content, 'isEnumerable') === true;
};

/** @class

  An ObjectProxy gives you a simple way to manage the editing state of
  an object.  You can use an ObjectProxy instance as a "proxy" for your
  model objects.
  
  Any properties you get or set on the object controller, will be passed 
  through to its content object.  This allows you to setup bindings to your
  object controller one time for all of your views and then swap out the 
  content as needed.
  
  ## Working with Arrays
  
  An ObjectController can accept both arrays and single objects as content.  
  If the content is an array, the ObjectProxy will do its best to treat 
  the array as a single object.  For example, if you set the content of an
  ObjectProxy to an array of Contact records and then call:
  
      contactController.get('name');

  The controller will check the name property of each Contact in the array.  
  If the value of the property for each Contact is the same, that value will 
  be returned.  If the any values are different, then an array will be 
  returned with the values from each Contact in them. 
  
  Most SproutCore views can work with both arrays and single content, which 
  means that most of the time, you can simply hook up your views and this will
  work.
  
  If you would prefer to make sure that your ObjectProxy is always 
  working with a single object and you are using bindings, you can always 
  setup your bindings so that they will convert the content to a single object 
  like so:
  
      contentBinding: SC.Binding.single('MyApp.listController.selection') ;

  This will ensure that your content property is always a single object 
  instead of an array.
  
  @extends SC.Object
*/
SC.ObjectProxy = SC.Object.extend({
  
  /**
    Set to the object you want this controller to manage.  The object should
    usually be a single value; not an array or enumerable.  If you do supply
    an array or enumerable with a single item in it, the ObjectController
    will manage that single item.

    Usually your content object should implement the SC.Observable mixin, but
    this is not required.  All SC.Object-based objects support SC.Observable
    
    @property {Object}
  */
  content: null,

  /**
    If true, then setting the content to an enumerable or an array with more 
    than one item will cause the Controller to attempt to treat the array as
    a single object.  Use of get(), for example, will get every property on
    the enumerable and return it.  set() will set the property on every item
    in the enumerable. 
    
    If false, then setting content to an enumerable with multiple items will be
    treated like setting a null value.  hasContent will be NO.
    
    @property {Boolean}
  */
  allowsMultipleContent: false,

  /**
    Becomes true whenever this object is managing content.  Usually this means
    the content property contains a single object or an array or enumerable
    with a single item.  Array's or enumerables with multiple items will 
    normally make this property false unless allowsMultipleContent is true.
    
    @property {Boolean}
  */
  hasContent: function() {
    return !SC.none(this.get('observableContent'));
  }.property('observableContent'),
  
  /**
    Makes a proxy editable or not editable.
    
    @property {Boolean}
  */
  isEditable: true,
  
  /**
    Primarily for internal use.  Normally you should not access this property 
    directly.  
    
    Returns the actual observable object proxied by this controller.  Usually 
    this property will mirror the content property.  In some cases - notably 
    when setting content to an enumerable, this may return a different object.
    
    Note that if you set the content to an enumerable which itself contains
    enumerables and allowsMultipleContent is false, this will become null.
    
    @property {Object}
  */
  observableContent: function() {
    var content = get(this, 'content'),
        len, allowsMultiple;
        
    // if enumerable, extract the first item or possibly become null
    if (content && SC.isEnumerable(content)) {
      len = get(content, 'length');
      allowsMultiple = get(this, 'allowsMultipleContent');
      
      if (len === 1) {
        content = get(content, 'firstObject');
      } else if (len === 0 || !allowsMultiple) {
        content = null;
      }
      
      // if we got some new content, it better not be enum also...
      if (content && !allowsMultiple && SC.isEnumerable(content)) content = null;
    }
    
    return content;
  }.property('content', 'allowsMultipleContent').cacheable(),

  /**
    Override this method to destroy the selected object.
    
    The default just passes this call onto the content object if it supports
    it, and then sets the content to null.  
    
    Unlike most calls to destroy() this will not actually destroy the 
    controller itself; only the the content.  You continue to use the 
    controller by setting the content to a new value.
    
    @returns {SC.ObjectProxy} receiver
  */
  destroy: function() {
    var content = get(this, 'observableContent') ;
    if (content && SC.typeOf(content.destroy) === 'function') {
      content.destroy();
    } 
    set(this, 'content', null) ;  
    return this;
  },

  /**
    Called whenver you try to get/set an unknown property.  The default 
    implementation will pass through to the underlying content object but 
    you can override this method to do some other kind of processing if 
    needed.
    
    @property {String} key key being retrieved
    @property {Object} value value to set or undefined if reading only
    @returns {Object} property value
  */
  unknownProperty: function(key, value) {    
    this._proxiedProperties.add(key);
    SC.defineProperty(this, key, SC.computed(function(key, value) {
      // for all other keys, just pass through to the observable object if 
      // there is one.  Use getEach() and setEach() on enumerable objects.
      var content = get(this, 'observableContent');
      if (content === null || content === undefined) return undefined; // empty

      if (value === undefined) {
        if (SC.isEnumerable(content)) {
          value = content.getEach(key);
          if (get(value, 'length') === 0) {
            value = undefined; // empty array.
          } else if (value.uniq().get('length') === 1) {
            value = get(value, 'firstObject');
          }
        } else {
          value = get(content, key);
        }
      } else {
        if (!get(this, 'isEditable')) {
          throw SC.Error.create("%@.%@ is not editable".fmt(this, key));
        }
        if (SC.isEnumerable(content)) {
          content.setEach(key, value);
        } else {
          set(content, key, value);
        }
      }
      return value;
    }).property('observableContent.' + key).cacheable());
    return get(this, key);
  },

  /**
  */
  contentDidChange: function() {
    this._proxiedProperties.forEach(function(key){
      this.notifyPropertyChange(key);
    }, this);
  }.observes('content'),

  /** @private */
  _proxiedProperties: new SC.Set()
});
