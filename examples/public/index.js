/*!
 * Copyright (C) 2018-2020 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
'use strict';
var Loader;
(function(Loader) {
  /**
   * Loaded modules.
   */
  const cache = {};

  /**
   * Modules repository.
   */
  const repository = {};

  /**
   * Loading locations.
   */
  const loading = [];

  /**
   * Get the directory name of the specified path.
   * @param path Path.
   * @returns Returns the directory name.
   */
  function dirname(path) {
    const output = normalize(path).split('/');
    return output.splice(0, output.length - 1).join('/');
  }

  /**
   * Get the normalized path from the specified path.
   * @param path Path.
   * @return Returns the normalized path.
   */
  function normalize(path) {
    const input = path.split('/');
    const output = [];
    for (let i = 0; i < input.length; ++i) {
      const directory = input[i];
      if (i === 0 || (directory.length && directory !== '.')) {
        if (directory === '..') {
          output.pop();
        } else {
          output.push(directory);
        }
      }
    }
    return output.join('/');
  }

  /**
   * Load the module that corresponds to the specified location.
   * @param location Module location.
   * @returns Returns all exported members.
   */
  function loadModule(location) {
    const baseDir = Loader.baseDirectory;
    const source = repository[location];
    const module = {
      loaded: false,
      filename: location,
      path: dirname(location),
      exports: cache[location]
    };
    let caught;
    try {
      Loader.baseDirectory = source.pack ? module.filename : module.path;
      loading.push(location);
      source.invoke(module, module.exports, require);
      module.loaded = true;
    } catch (exception) {
      caught = exception;
    } finally {
      Loader.baseDirectory = baseDir;
      loading.pop();
      if (caught) {
        throw caught;
      }
      return module.exports;
    }
  }

  /**
   * Require the module that corresponds to the specified path.
   * @param path Module path.
   * @returns Returns all exported members.
   * @throws Throws an error when the specified module doesn't exists.
   */
  function require(path) {
    const relative = path[0] === '.';
    const location = normalize(relative ? `${Loader.baseDirectory}/${path}` : path);
    if (!cache[location]) {
      if (!repository[location]) {
        const current = loading[loading.length - 1] || '.';
        throw new Error(`Module "${path}" required by "${current}" doesn't found.`);
      }
      cache[location] = {};
      return loadModule(location);
    }
    return cache[location];
  }

  /**
   * Register new modules into the loader.
   * @param modules Modules object.
   */
  function register(modules) {
    for (const entry in modules) {
      if (!(entry in repository)) {
        repository[entry] = modules[entry];
      }
    }
  }

  // Setup the loader.
  if (!window.require) {
    // Set the default directory.
    Loader.baseDirectory = '.';
    // Set all properties.
    Object.defineProperties(window, {
      require: {
        value: require,
        configurable: false,
        writable: false
      },
      Loader: {
        value: Loader,
        configurable: false,
        writable: false
      }
    });
  }

  // Set the loader method.
  Object.defineProperties(Loader, {
    register: {
      value: register,
      configurable: false,
      writable: false
    }
  });

  // Register all modules.
  window.Loader.register({"@singleware/class/exception":{pack:false, invoke:function(module, exports, require){
"use strict";
/**
 * Copyright (C) 2018 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Custom exception class.
 */
class Exception extends Error {
}
exports.Exception = Exception;

}},
"@singleware/class/helper":{pack:false, invoke:function(module, exports, require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const exception_1 = require("./exception");
/**
 * Provide decorators and methods to protect classes at runtime.
 */
var Helper;
(function (Helper) {
    /**
     * Map to access the original proxy context.
     */
    const contextMap = new WeakMap();
    /**
     * Map to access a context vault.
     */
    const vaultMap = new WeakMap();
    /**
     * Set list for locked classes.
     */
    const lockedSet = new WeakSet();
    /**
     * Set list for wrapped members.
     */
    const memberSet = new WeakSet();
    /**
     * Set list for wrapped types.
     */
    const typeSet = new WeakSet();
    /**
     * Calling type to determine the current access rules.
     */
    let callingType;
    /**
     * Resolves the given proxy to its original context.
     * @param proxy Proxy to be resolved.
     * @returns Returns the resolved proxy context.
     */
    function getOriginalContext(proxy) {
        return (contextMap.get(proxy) || proxy);
    }
    /**
     * Determines whether the specified type is derived from base type.
     * @param type Class type.
     * @param base Base class type.
     * @returns Returns true when the specified type is derived from base type, false otherwise.
     */
    function isDerived(type, base) {
        while ((type = Reflect.getPrototypeOf(type)) && type.prototype) {
            if (type.prototype.constructor === base.prototype.constructor) {
                return true;
            }
        }
        return false;
    }
    /**
     * Determines whether the specified property is member of the given class type.
     * @param type Class type.
     * @param property Property name.
     * @returns Returns true when the specified property is a member, false otherwise.
     */
    function isMember(type, property) {
        do {
            if (Reflect.getOwnPropertyDescriptor(type.prototype, property) || Reflect.getOwnPropertyDescriptor(type, property)) {
                return true;
            }
        } while ((type = Reflect.getPrototypeOf(type)) && type.prototype && typeSet.has(type.prototype.constructor));
        return false;
    }
    /**
     * Wraps the specified context to ensure its access rules automatically in each method call.
     * @param type Class type.
     * @param context Class context.
     * @returns Returns the new generated proxy to the original context.
     */
    function wrapContext(type, context) {
        const proxy = new Proxy(context, {
            get: (target, property, receiver) => {
                let value;
                if (!isMember(type, property)) {
                    if ((value = Reflect.get(target, property, getOriginalContext(receiver))) && value instanceof Function) {
                        return function (...parameters) {
                            return value.apply(getOriginalContext(this), parameters);
                        };
                    }
                }
                else {
                    if ((value = performCall(type, target, Reflect.get, [target, property, receiver])) && memberSet.has(value)) {
                        return function (...parameters) {
                            return performCall(type, this, value, parameters);
                        };
                    }
                }
                return value;
            },
            set: (target, property, value, receiver) => {
                if (!isMember(type, property)) {
                    return Reflect.set(target, property, value, getOriginalContext(receiver));
                }
                else {
                    return performCall(type, target, Reflect.set, [target, property, value, receiver]);
                }
            }
        });
        contextMap.set(proxy, context);
        return proxy;
    }
    /**
     * Perform the specified callback with the given parameters.
     * @param type Calling class type.
     * @param context Calling context.
     * @param callback Calling member.
     * @param parameters Calling parameters.
     * @returns Returns the same result of the performed callback.
     * @throws Throws the same error of the performed callback.
     */
    function performCall(type, context, callback, parameters) {
        const originalCalling = callingType;
        const currentContext = context ? wrapContext(type, getOriginalContext(context)) : context;
        try {
            callingType = type;
            return callback.apply(currentContext, parameters);
        }
        catch (exception) {
            throw exception;
        }
        finally {
            callingType = originalCalling;
        }
    }
    /**
     * Wraps the specified callback to be a public member.
     * @param type Class type.
     * @param property Property key.
     * @param callback Original member callback.
     * @returns Returns the wrapped callback.
     */
    function publicWrapper(type, property, callback) {
        const member = function (...parameters) {
            return performCall(type, this, callback, parameters);
        };
        memberSet.add(member);
        return member;
    }
    /**
     * Wraps the specified callback to be a protected member.
     * @param type Class type.
     * @param property Property key.
     * @param callback Original member callback.
     * @returns Returns the wrapped callback.
     * @throws Throws an error when the current calling type isn't the same type or instance of expected type.
     */
    function protectedWrapper(type, property, callback) {
        const member = function (...parameters) {
            if (!callingType || (callingType !== type && !isDerived(type, callingType) && !isDerived(callingType, type))) {
                throw new exception_1.Exception(`Access to the protected member '${property}' has been denied.`);
            }
            return performCall(type, this, callback, parameters);
        };
        memberSet.add(member);
        return member;
    }
    /**
     * Wraps the specified callback to be a private member.
     * @param type Class type.
     * @param property Property key.
     * @param callback Original member callback.
     * @returns Returns the wrapped callback.
     * @throws Throws an error when the current calling type isn't the same type of the expected type.
     */
    function privateWrapper(type, property, callback) {
        const member = function (...parameters) {
            if (callingType !== type) {
                throw new exception_1.Exception(`Access to the private member '${property}' has been denied.`);
            }
            return performCall(type, this, callback, parameters);
        };
        memberSet.add(member);
        return member;
    }
    /**
     * Locks the specified class constructor to returns its instance in a wrapped context.
     * @param type Class Type.
     * @returns Returns the locked class type.
     */
    function lockClass(type) {
        if (!lockedSet.has(type.prototype.constructor)) {
            const basePrototype = Reflect.getPrototypeOf(type).prototype;
            if (!basePrototype) {
                console.warn(`For security and compatibility reasons the class '${type.name}' must extends the default class Null.`);
            }
            else if (!typeSet.has(basePrototype.constructor)) {
                class ClassLocker extends basePrototype.constructor {
                    constructor(...parameters) {
                        return wrapContext(type.prototype.constructor, super(...parameters));
                    }
                }
                Reflect.setPrototypeOf(type, ClassLocker);
            }
            lockedSet.add(type.prototype.constructor);
        }
        return type;
    }
    /**
     * Wraps the specified class type.
     * @param type Class type.
     * @returns Returns the wrapped class type.
     * @throws Throws an error when the class was already wrapped.
     */
    function wrapClass(type) {
        if (typeSet.has(type.prototype.constructor)) {
            throw new exception_1.Exception(`Access to the class has been denied.`);
        }
        typeSet.add(type.prototype.constructor);
        return new Proxy(lockClass(type), {
            construct: (target, parameters, derived) => {
                const currentType = target.prototype.constructor;
                const derivedType = derived.prototype.constructor;
                const context = performCall(currentType, void 0, Reflect.construct, [target, parameters, derived]);
                return currentType !== derivedType ? wrapContext(callingType, getOriginalContext(context)) : getOriginalContext(context);
            }
        });
    }
    /**
     * Wraps the specified member with the given wrapper function.
     * @param target Member target.
     * @param property Property key.
     * @param descriptor Property descriptor.
     * @param wrapper Wrapper function.
     * @returns Returns the wrapped property descriptor.
     * @throws Throws an error when the class was already wrapped.
     */
    function wrapMember(target, property, descriptor, wrapper) {
        const type = (target instanceof Function ? target : target.constructor).prototype.constructor;
        if (typeSet.has(type)) {
            throw new exception_1.Exception(`Access to the class has been denied.`);
        }
        if (descriptor.value instanceof Function) {
            descriptor.value = wrapper(type, property, descriptor.value);
        }
        else {
            if (descriptor.get instanceof Function) {
                descriptor.get = wrapper(type, property, descriptor.get);
            }
            if (descriptor.set instanceof Function) {
                descriptor.set = wrapper(type, property, descriptor.set);
            }
        }
        return descriptor;
    }
    /**
     * Creates a new getter and setter member for the specified property.
     * @param target Member target.
     * @param property Property name.
     * @returns Returns the new member property descriptor.
     */
    function createMember(target, property) {
        const initial = target.hasOwnProperty(property) ? target[property] : void 0;
        let vault;
        return {
            get: function () {
                const context = getOriginalContext(this);
                if (!(vault = vaultMap.get(context))) {
                    vaultMap.set(context, (vault = {}));
                }
                return property in vault ? vault[property] : (vault[property] = initial);
            },
            set: function (value) {
                const context = getOriginalContext(this);
                if (!(vault = vaultMap.get(context))) {
                    vaultMap.set(context, (vault = {}));
                }
                vault[property] = value;
            }
        };
    }
    /**
     * Default class for security and compatibility reasons.
     */
    class Null {
    }
    Helper.Null = Null;
    /**
     * Decorates the specified class to ensure its access rules at runtime.
     * @returns Returns the decorator method.
     */
    function Describe() {
        return (target) => {
            return wrapClass(target);
        };
    }
    Helper.Describe = Describe;
    /**
     * Decorates the specified class member to be public at runtime.
     * @returns Returns the decorator method.
     */
    function Public() {
        return (target, property, descriptor) => {
            return wrapMember(target, property, descriptor || createMember(target, property), publicWrapper);
        };
    }
    Helper.Public = Public;
    /**
     * Decorates the specified class member to be protected at runtime.
     * @returns Returns the decorator method.
     */
    function Protected() {
        return (target, property, descriptor) => {
            return wrapMember(target, property, descriptor || createMember(target, property), protectedWrapper);
        };
    }
    Helper.Protected = Protected;
    /**
     * Decorates the specified class member to be private at runtime.
     * @returns Returns the decorator method.
     */
    function Private() {
        return (target, property, descriptor) => {
            return wrapMember(target, property, descriptor || createMember(target, property), privateWrapper);
        };
    }
    Helper.Private = Private;
    /**
     * Decorates the specified class member to be an enumerable property at runtime.
     * @returns Returns the decorator method.
     */
    function Property() {
        return (target, property, descriptor) => {
            return ((descriptor || (descriptor = createMember(target, property))).enumerable = true), descriptor;
        };
    }
    Helper.Property = Property;
    /**
     * Performs the specified callback using the specified context rules.
     * @param context Context instance.
     * @param callback Callback to be performed.
     * @param parameters Calling parameters.
     * @returns Returns the same result of the performed callback.
     * @throws Throws an error when the provided context isn't valid or the same error of the performed callback.
     */
    async function perform(context, callback, ...parameters) {
        if (!contextMap.has(context)) {
            throw new exception_1.Exception(`The provided context isn't a valid context.`);
        }
        const originalContext = getOriginalContext(context);
        const originalType = Reflect.getPrototypeOf(originalContext).constructor;
        return await performCall(originalType, originalContext, callback, parameters);
    }
    Helper.perform = perform;
    /**
     * Resolves the given wrapped context to the original context.
     * @param context Context to be resolved.
     * @returns Returns the original context.
     */
    function resolve(context) {
        return getOriginalContext(context);
    }
    Helper.resolve = resolve;
})(Helper = exports.Helper || (exports.Helper = {}));

}},
"@singleware/class/index":{pack:false, invoke:function(module, exports, require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var exception_1 = require("./exception");
exports.Exception = exception_1.Exception;
/**
 * Declarations.
 */
const helper_1 = require("./helper");
/**
 * Default null class for security reasons.
 */
exports.Null = helper_1.Helper.Null;
/**
 * Decorates the specified class to ensure its access rules at runtime.
 * @returns Returns the decorator method.
 */
exports.Describe = () => helper_1.Helper.Describe();
/**
 * Decorates the specified class member to be public at runtime.
 * @returns Returns the decorator method.
 */
exports.Public = () => helper_1.Helper.Public();
/**
 * Decorates the specified class member to be protected at runtime.
 * @returns Returns the decorator method.
 */
exports.Protected = () => helper_1.Helper.Protected();
/**
 * Decorates the specified class member to be private at runtime.
 * @returns Returns the decorator method.
 */
exports.Private = () => helper_1.Helper.Private();
/**
 * Decorates the specified class member to be an enumerable property at runtime.
 * @returns Returns the decorator method.
 */
exports.Property = () => helper_1.Helper.Property();
/**
 * Performs the specified callback using the specified context rules.
 * @param context Context instance.
 * @param callback Callback to be performed.
 * @param parameters Calling parameters.
 * @returns Returns the same result of the performed callback.
 * @throws Throws the same error of the performed callback.
 */
exports.perform = async (context, callback, ...parameters) => helper_1.Helper.perform(context, callback, ...parameters);
/**
 * Resolves the given wrapped context to the original context.
 * @param context Context to be resolved.
 * @returns Returns the original context.
 */
exports.resolve = (context) => helper_1.Helper.resolve(context);

}},
"@singleware/class":{pack:true, invoke:function(module, exports, require){
Object.assign(exports, require('./index'));
}},
"@singleware/injection/index":{pack:false, invoke:function(module, exports, require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
var manager_1 = require("./manager");
exports.Manager = manager_1.Manager;
const manager_2 = require("./manager");
// Global manager.
const global = new manager_2.Manager();
/**
 * Decorates the specified class to be a global dependency class.
 * @param settings Dependency settings.
 * @returns Returns the decorator method.
 */
exports.Describe = (settings) => global.Describe(settings);
/**
 * Decorates a class type or class property to be injected by the specified dependencies.
 * @param dependency First dependency.
 * @param dependencies Remaining dependencies.
 * @returns Returns the decorator method.
 * @throws Throws an error when multiple dependencies are specified in a class property injection.
 */
exports.Inject = (dependency, ...dependencies) => global.Inject(dependency, ...dependencies);
/**
 * Resolves the current instance of the specified class type.
 * @param type Class type.
 * @throws Throws a type error when the class type does not exists in the dependencies.
 * @returns Returns the resolved instance.
 */
exports.resolve = (type) => global.resolve(type);
/**
 * Constructs a new instance of the specified class type.
 * @param type Class type.
 * @param parameters Initial parameters.
 * @returns Returns a new instance of the specified class type.
 */
exports.construct = (type, ...parameters) => global.construct(type, ...parameters);

}},
"@singleware/injection":{pack:true, invoke:function(module, exports, require){
Object.assign(exports, require('./index'));
}},
"@singleware/injection/manager":{pack:false, invoke:function(module, exports, require){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
const Class = require("@singleware/class");
/**
 * Dependency manager class.
 */
let Manager = class Manager extends Class.Null {
    /**
     * Dependency manager class.
     */
    constructor() {
        super(...arguments);
        /**
         * Map of injected properties.
         */
        this.injectionsMap = new WeakMap();
        /**
         * Map of singleton instances.
         */
        this.singletonsMap = new WeakMap();
        /**
         * Map of dependency settings.
         */
        this.settingsMap = new WeakMap();
    }
    /**
     * Wraps the specified dependency list in the given class type.
     * @param type Class type.
     * @param dependencies Dependency class list.
     * @returns Returns the wrapped class type.
     */
    wrapClass(type, dependencies) {
        return new Proxy(type, {
            construct: (target, parameters, other) => {
                const list = {};
                for (const type of dependencies) {
                    const settings = this.settingsMap.get(type.prototype.constructor);
                    list[settings.name || type.name] = this.resolve(type);
                }
                return Reflect.construct(target, [list, parameters], other);
            }
        });
    }
    /**
     * Creates a new property for the specified dependency.
     * @param property Property name.
     * @param dependency Dependency class.
     * @returns Returns the generated property descriptor.
     */
    createProperty(property, dependency) {
        const resolver = this.resolve.bind(this, dependency);
        const injections = this.injectionsMap;
        let map;
        return {
            enumerable: false,
            get: function () {
                const context = Class.resolve(this);
                if (!(map = injections.get(context))) {
                    injections.set(context, (map = {}));
                }
                return property in map ? map[property] : (map[property] = resolver());
            },
            set: function () {
                throw new Error(`Injected dependencies are read-only.`);
            }
        };
    }
    /**
     * Wraps the specified dependency into the given property descriptor.
     * @param property Property name.
     * @param dependency Dependency class.
     * @param descriptor Property descriptor.
     * @returns Returns the specified property descriptor or a new generated property descriptor.
     * @throws Throws an error when the property descriptor is a method.
     */
    wrapProperty(property, dependency, descriptor) {
        if (descriptor.value instanceof Function) {
            throw new Error(`Only properties are allowed for dependency injection.`);
        }
        else {
            if (!(descriptor.get instanceof Function) || !(descriptor.set instanceof Function)) {
                return this.createProperty(property, dependency);
            }
            else {
                const resolver = this.resolve.bind(this, dependency);
                const getter = descriptor.get;
                const setter = descriptor.set;
                descriptor.get = function () {
                    let instance = getter.call(this);
                    if (!instance) {
                        setter.call(this, (instance = resolver()));
                    }
                    return instance;
                };
                descriptor.set = function () {
                    throw new Error(`Injected dependencies are read-only.`);
                };
                return descriptor;
            }
        }
    }
    /**
     * Decorates the specified class to be a dependency class.
     * @param settings Dependency settings.
     * @returns Returns the decorator method.
     */
    Describe(settings) {
        return (type) => {
            if (this.settingsMap.has(type.prototype.constructor)) {
                throw new TypeError(`Dependency '${type.name}' is already described.`);
            }
            this.settingsMap.set(type.prototype.constructor, settings || {});
        };
    }
    /**
     * Decorates a class type or class property to be injected by the specified dependencies.
     * @param dependency First dependency.
     * @param dependencies Remaining dependencies.
     * @returns Returns the decorator method.
     * @throws Throws an error when multiple dependencies are specified in a class property injection.
     */
    Inject(dependency, ...dependencies) {
        return (scope, property, descriptor) => {
            if (!property) {
                return this.wrapClass(scope, [dependency, ...dependencies]);
            }
            else {
                if (dependencies.length > 0) {
                    throw new Error(`Multiple dependency injection in a class property isn't allowed.`);
                }
                return this.wrapProperty(property, dependency, descriptor || {});
            }
        };
    }
    /**
     * Resolves the current instance from the specified class type.
     * @param type Class type.
     * @throws Throws a type error when the class type isn't a described dependency.
     * @returns Returns the resolved instance.
     */
    resolve(type) {
        const constructor = type.prototype.constructor;
        const settings = this.settingsMap.get(constructor);
        if (!settings) {
            throw new TypeError(`Dependency '${type ? type.name : void 0}' doesn't found.`);
        }
        else {
            if (!settings.singleton) {
                return this.construct(type);
            }
            else {
                let instance = this.singletonsMap.get(constructor);
                if (!instance) {
                    this.singletonsMap.set(constructor, (instance = this.construct(type)));
                }
                return instance;
            }
        }
    }
    /**
     * Constructs a new instance for the specified class type.
     * @param type Class type.
     * @param parameters Initial parameters.
     * @returns Returns a new instance of the specified class type.
     */
    construct(type, ...parameters) {
        return new type(...parameters);
    }
};
__decorate([
    Class.Private()
], Manager.prototype, "injectionsMap", void 0);
__decorate([
    Class.Private()
], Manager.prototype, "singletonsMap", void 0);
__decorate([
    Class.Private()
], Manager.prototype, "settingsMap", void 0);
__decorate([
    Class.Private()
], Manager.prototype, "wrapClass", null);
__decorate([
    Class.Private()
], Manager.prototype, "createProperty", null);
__decorate([
    Class.Private()
], Manager.prototype, "wrapProperty", null);
__decorate([
    Class.Public()
], Manager.prototype, "Describe", null);
__decorate([
    Class.Public()
], Manager.prototype, "Inject", null);
__decorate([
    Class.Public()
], Manager.prototype, "resolve", null);
__decorate([
    Class.Public()
], Manager.prototype, "construct", null);
Manager = __decorate([
    Class.Describe()
], Manager);
exports.Manager = Manager;

}},
"@singleware/observable/index":{pack:false, invoke:function(module, exports, require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var subject_1 = require("./subject");
exports.Subject = subject_1.Subject;

}},
"@singleware/observable":{pack:true, invoke:function(module, exports, require){
Object.assign(exports, require('./index'));
}},
"@singleware/observable/subject":{pack:false, invoke:function(module, exports, require){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var Subject_1;
"use strict";
/**
 * Copyright (C) 2018 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
const Class = require("@singleware/class");
/**
 * Generic subject class.
 */
let Subject = Subject_1 = class Subject extends Class.Null {
    /**
     * Generic subject class.
     */
    constructor() {
        super(...arguments);
        /**
         * List of observers.
         */
        this.observers = [];
    }
    /**
     * Number of registered observers.
     */
    get length() {
        return this.observers.length;
    }
    /**
     * Subscribes the specified source into the subject.
     * @param source Source instance.
     * @returns Returns the own instance.
     */
    subscribe(source) {
        if (source instanceof Subject_1) {
            for (const observer of source.observers) {
                this.observers.push(observer);
            }
        }
        else {
            this.observers.push(source);
        }
        return this;
    }
    /**
     * Determines whether the subject contains the specified observer or not.
     * @param observer Observer instance.
     * @returns Returns true when the observer was found, false otherwise.
     */
    contains(observer) {
        return this.observers.indexOf(observer) !== -1;
    }
    /**
     * Unsubscribes the specified observer from the subject.
     * @param observer Observer instance.
     * @returns Returns true when the observer was removed, false when the observer does not exists in the subject.
     */
    unsubscribe(observer) {
        const index = this.observers.indexOf(observer);
        if (index > -1) {
            this.observers.splice(index, 1);
            return true;
        }
        return false;
    }
    /**
     * Notify all registered observers.
     * @param value Notification value.
     * @returns Returns the own instance.
     */
    notifyAllSync(value) {
        for (const observer of this.observers) {
            observer(value);
        }
        return this;
    }
    /**
     * Notify all registered observers asynchronously.
     * @param value Notification value.
     * @returns Returns a promise to get the own instance.
     */
    async notifyAll(value) {
        for (const observer of this.observers) {
            await observer(value);
        }
        return this;
    }
    /**
     * Notify all registered observers step by step with an iterator.
     * @param value Notification value.
     * @returns Returns a new notification iterator.
     */
    *notifyStep(value) {
        for (const observer of this.observers) {
            yield observer(value);
        }
        return this;
    }
};
__decorate([
    Class.Protected()
], Subject.prototype, "observers", void 0);
__decorate([
    Class.Public()
], Subject.prototype, "length", null);
__decorate([
    Class.Public()
], Subject.prototype, "subscribe", null);
__decorate([
    Class.Public()
], Subject.prototype, "contains", null);
__decorate([
    Class.Public()
], Subject.prototype, "unsubscribe", null);
__decorate([
    Class.Public()
], Subject.prototype, "notifyAllSync", null);
__decorate([
    Class.Public()
], Subject.prototype, "notifyAll", null);
__decorate([
    Class.Public()
], Subject.prototype, "notifyStep", null);
Subject = Subject_1 = __decorate([
    Class.Describe()
], Subject);
exports.Subject = Subject;

}},
"@singleware/pipeline/index":{pack:false, invoke:function(module, exports, require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright (C) 2018 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
var subject_1 = require("./subject");
exports.Subject = subject_1.Subject;

}},
"@singleware/pipeline":{pack:true, invoke:function(module, exports, require){
Object.assign(exports, require('./index'));
}},
"@singleware/pipeline/subject":{pack:false, invoke:function(module, exports, require){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright (C) 2018 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
const Class = require("@singleware/class");
const Observable = require("@singleware/observable");
/**
 * Generic subject class.
 */
let Subject = class Subject extends Observable.Subject {
    /**
     * Notify the first registered observer and remove it.
     * @param value Notification value.
     * @returns Returns the own instance.
     */
    notifyFirstSync(value) {
        const observer = this.observers.shift();
        if (observer) {
            observer(value);
        }
        return this;
    }
    /**
     * Notify the first registered observer asynchronously and remove it.
     * @param value Notification value.
     * @returns Returns a promise to get the own instance.
     */
    async notifyFirst(value) {
        const observer = this.observers.shift();
        if (observer) {
            await observer(value);
        }
        return this;
    }
    /**
     * Notify the last registered observer and remove it.
     * @param value Notification value.
     * @returns Returns the own instance.
     */
    notifyLastSync(value) {
        const observer = this.observers.pop();
        if (observer) {
            observer(value);
        }
        return this;
    }
    /**
     * Notify the last registered observer asynchronously and remove it.
     * @param value Notification value.
     * @returns Returns a promise to get the own instance.
     */
    async notifyLast(value) {
        const observer = this.observers.pop();
        if (observer) {
            await observer(value);
        }
        return this;
    }
};
__decorate([
    Class.Public()
], Subject.prototype, "notifyFirstSync", null);
__decorate([
    Class.Public()
], Subject.prototype, "notifyFirst", null);
__decorate([
    Class.Public()
], Subject.prototype, "notifyLastSync", null);
__decorate([
    Class.Public()
], Subject.prototype, "notifyLast", null);
Subject = __decorate([
    Class.Describe()
], Subject);
exports.Subject = Subject;

}},
"@singleware/routing/index":{pack:false, invoke:function(module, exports, require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var match_1 = require("./match");
exports.Match = match_1.Match;
var router_1 = require("./router");
exports.Router = router_1.Router;

}},
"@singleware/routing":{pack:true, invoke:function(module, exports, require){
Object.assign(exports, require('./index'));
}},
"@singleware/routing/match":{pack:false, invoke:function(module, exports, require){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
const Class = require("@singleware/class");
/**
 * Generic match manager class.
 */
let Match = class Match extends Class.Null {
    /**
     * Default constructor.
     * @param path Matched path.
     * @param remaining Remaining path.
     * @param variables List of matched variables.
     * @param detail Extra details data for notifications.
     * @param events Pipeline of matched events.
     */
    constructor(path, remaining, variables, detail, events) {
        super();
        this.matchPath = path;
        this.matchEvents = events;
        this.matchVariables = variables;
        this.currentVariables = variables.shift();
        this.remainingPath = remaining;
        this.extraDetails = detail;
    }
    /**
     * Current match length.
     */
    get length() {
        return this.matchEvents.length;
    }
    /**
     * Matched path.
     */
    get path() {
        return this.matchPath;
    }
    /**
     * Remaining path.
     */
    get remaining() {
        return this.remainingPath;
    }
    /**
     * Matched variables.
     */
    get variables() {
        return this.currentVariables || {};
    }
    /**
     * Extra details data.
     */
    get detail() {
        return this.extraDetails;
    }
    /**
     * Determines whether it is an exact match or not.
     */
    get exact() {
        return this.remainingPath.length === 0;
    }
    /**
     * Moves to the next matched route and notify it.
     * @returns Returns the own instance.
     */
    nextSync() {
        this.matchEvents.notifyFirstSync(this);
        this.currentVariables = this.matchVariables.shift();
        return this;
    }
    /**
     * Moves to the next matched route and notify it asynchronously.
     * @returns Returns a promise to get the own instance.
     */
    async next() {
        await this.matchEvents.notifyFirst(this);
        this.currentVariables = this.matchVariables.shift();
        return this;
    }
};
__decorate([
    Class.Private()
], Match.prototype, "matchPath", void 0);
__decorate([
    Class.Private()
], Match.prototype, "matchEvents", void 0);
__decorate([
    Class.Private()
], Match.prototype, "matchVariables", void 0);
__decorate([
    Class.Private()
], Match.prototype, "currentVariables", void 0);
__decorate([
    Class.Private()
], Match.prototype, "remainingPath", void 0);
__decorate([
    Class.Private()
], Match.prototype, "extraDetails", void 0);
__decorate([
    Class.Public()
], Match.prototype, "length", null);
__decorate([
    Class.Public()
], Match.prototype, "path", null);
__decorate([
    Class.Public()
], Match.prototype, "remaining", null);
__decorate([
    Class.Public()
], Match.prototype, "variables", null);
__decorate([
    Class.Public()
], Match.prototype, "detail", null);
__decorate([
    Class.Public()
], Match.prototype, "exact", null);
__decorate([
    Class.Public()
], Match.prototype, "nextSync", null);
__decorate([
    Class.Public()
], Match.prototype, "next", null);
Match = __decorate([
    Class.Describe()
], Match);
exports.Match = Match;

}},
"@singleware/routing/router":{pack:false, invoke:function(module, exports, require){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
const Class = require("@singleware/class");
const Pipeline = require("@singleware/pipeline");
const match_1 = require("./match");
/**
 * Generic router class.
 */
let Router = class Router extends Class.Null {
    /**
     * Default constructor.
     * @param settings Router settings.
     */
    constructor(settings) {
        super();
        /**
         * Router entries.
         */
        this.entries = {};
        /**
         * Entries counter.
         */
        this.counter = 0;
        this.settings = settings;
    }
    /**
     * Splits the specified path into an array of directories.
     * @param path Path to be splitted.
     * @returns Returns the array of directories.
     */
    splitPath(path) {
        const pieces = path.split(this.settings.separator);
        const directories = [this.settings.separator];
        for (let i = 0; i < pieces.length; ++i) {
            const directory = pieces[i];
            if (directory.length) {
                directories.push(directory);
                if (i + 1 < pieces.length) {
                    directories.push(this.settings.separator);
                }
            }
        }
        return directories;
    }
    /**
     * Creates a new empty entry.
     * @param pattern Variable pattern.
     * @param variable Variable name.
     * @returns Returns a new entry instance.
     */
    createEntry(pattern, variable) {
        return {
            pattern: pattern,
            variable: variable,
            entries: {},
            partial: [],
            exact: []
        };
    }
    /**
     * Inserts all required entries for the specified array of directories.
     * @param directories Array of directories.
     * @param constraint Path constraint.
     * @returns Returns the last inserted entry.
     * @throws Throws an error when the rules for the specified variables was not found.
     */
    insertEntries(directories, constraint) {
        let entries = this.entries;
        let entry;
        for (let directory of directories) {
            let match, variable, pattern;
            if ((match = this.settings.variable.exec(directory))) {
                if (!(pattern = constraint[(variable = match[1])])) {
                    throw new TypeError(`Constraint rules for the variable "${variable}" was not found.`);
                }
                directory = pattern.toString();
            }
            if (!(entry = entries[directory])) {
                entries[directory] = entry = this.createEntry(pattern, variable);
                ++this.counter;
            }
            entries = entry.entries;
        }
        return entry;
    }
    /**
     * Search all entries that corresponds to the expected directory.
     * @param directory Expected directory.
     * @param entries Entries to select.
     * @returns Returns the selection results.
     */
    searchEntries(directory, entries) {
        const selection = { directories: [], entries: [], variables: {} };
        for (const current in entries) {
            const entry = entries[current];
            if (entry.pattern && entry.variable) {
                let match;
                if ((match = entry.pattern.exec(directory))) {
                    selection.variables[entry.variable] = directory;
                    selection.entries.push(entry);
                }
            }
            else if (current === directory) {
                selection.entries.push(entry);
            }
        }
        return selection;
    }
    /**
     * Collect all entries that corresponds to the specified array of directories.
     * The array of directories will be reduced according to the number of entries found.
     * @param directories Array of directories.
     * @returns Returns the selection results.
     */
    collectEntries(directories) {
        let selection = { directories: [], entries: [], variables: {} };
        let targets = [this.entries];
        let variables = {};
        while (directories.length && targets.length) {
            const tempTargets = [];
            const tempEntries = [];
            for (const entries of targets) {
                const tempSearch = this.searchEntries(directories[0], entries);
                variables = { ...tempSearch.variables, ...variables };
                for (const entry of tempSearch.entries) {
                    if (entry.partial.length || entry.exact.length) {
                        tempEntries.push(entry);
                    }
                    tempTargets.push(entry.entries);
                }
            }
            targets = tempTargets;
            if (tempTargets.length) {
                selection.directories.push(directories.shift());
            }
            if (tempEntries.length) {
                selection.entries = tempEntries;
                selection.variables = variables;
            }
        }
        return selection;
    }
    /**
     * Number of routes.
     */
    get length() {
        return this.counter;
    }
    /**
     * Adds the specified routes into the router.
     * @param routes List of routes.
     * @returns Returns the own instance.
     */
    add(...routes) {
        for (const route of routes) {
            const entry = this.insertEntries(this.splitPath(route.path), route.constraint || {});
            const event = { environment: route.environment, callback: route.onMatch };
            if (route.exact) {
                entry.exact.push(event);
            }
            else {
                entry.partial.push(event);
            }
        }
        return this;
    }
    /**
     * Match all routes that corresponds to the specified path.
     * @param path Route path.
     * @param detail Extra details used in the route notification.
     * @returns Returns the manager for the matched routes.
     */
    match(path, detail) {
        const directories = this.splitPath(path);
        const selection = this.collectEntries(directories);
        const pipeline = new Pipeline.Subject();
        const variables = [];
        const remaining = directories.join('');
        const collected = selection.directories.join('');
        for (const entry of selection.entries) {
            if (remaining.length === 0) {
                for (const event of entry.exact) {
                    pipeline.subscribe(event.callback);
                    variables.push({ ...selection.variables, ...event.environment });
                }
            }
            for (const event of entry.partial) {
                pipeline.subscribe(event.callback);
                variables.push({ ...selection.variables, ...event.environment });
            }
        }
        return new match_1.Match(collected, remaining, variables, detail, pipeline);
    }
    /**
     * Clear the router.
     * @returns Returns the own instance.
     */
    clear() {
        this.entries = {};
        this.counter = 0;
        return this;
    }
};
__decorate([
    Class.Private()
], Router.prototype, "entries", void 0);
__decorate([
    Class.Private()
], Router.prototype, "counter", void 0);
__decorate([
    Class.Private()
], Router.prototype, "settings", void 0);
__decorate([
    Class.Private()
], Router.prototype, "splitPath", null);
__decorate([
    Class.Private()
], Router.prototype, "createEntry", null);
__decorate([
    Class.Private()
], Router.prototype, "insertEntries", null);
__decorate([
    Class.Private()
], Router.prototype, "searchEntries", null);
__decorate([
    Class.Private()
], Router.prototype, "collectEntries", null);
__decorate([
    Class.Public()
], Router.prototype, "length", null);
__decorate([
    Class.Public()
], Router.prototype, "add", null);
__decorate([
    Class.Public()
], Router.prototype, "match", null);
__decorate([
    Class.Public()
], Router.prototype, "clear", null);
Router = __decorate([
    Class.Describe()
], Router);
exports.Router = Router;

}},
"@singleware/application/aliases":{pack:false, invoke:function(module, exports, require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
const Routing = require("@singleware/routing");
const Observable = require("@singleware/observable");
/**
 * Application request observer.
 */
exports.RequestSubject = Observable.Subject;
/**
 * Application router.
 */
exports.Router = Routing.Router;
/**
 * Application router.
 */
exports.Match = Routing.Match;
//# sourceMappingURL=aliases.js.map
}},
"@singleware/application/index":{pack:false, invoke:function(module, exports, require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
var main_1 = require("./main");
exports.Main = main_1.Main;
var aliases_1 = require("./aliases");
exports.Router = aliases_1.Router;
exports.Match = aliases_1.Match;
exports.RequestSubject = aliases_1.RequestSubject;
// Declarations
const main_2 = require("./main");
/**
 * Decorates the specified member to filter an application request. (Alias for Main.Filter)
 * @param action Filter action settings.
 * @returns Returns the decorator method.
 */
exports.Filter = (action) => main_2.Main.Filter(action);
/**
 * Decorates the specified member to process an application request. (Alias for Main.Processor)
 * @param action Route action settings.
 * @returns Returns the decorator method.
 */
exports.Processor = (action) => main_2.Main.Processor(action);
// Imported aliases.
const Types = require("./types");
/**
 * Types namespace.
 */
exports.Types = Types;
//# sourceMappingURL=index.js.map
}},
"@singleware/application":{pack:true, invoke:function(module, exports, require){
Object.assign(exports, require('./index'));
}},
"@singleware/application/main":{pack:false, invoke:function(module, exports, require){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Main_1;
Object.defineProperty(exports, "__esModule", { value: true });
"use strict";
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
const Class = require("@singleware/class");
const Routing = require("@singleware/routing");
const Injection = require("@singleware/injection");
const Types = require("./types");
/**
 * Generic main application class.
 */
let Main = Main_1 = class Main extends Class.Null {
    /**
     * Default constructor.
     * @param settings Application settings.
     */
    constructor(settings) {
        super();
        /**
         * Determines whether the application is started or not.
         */
        this.started = false;
        /**
         * Dependency Injection Manager.
         */
        this.dim = new Injection.Manager();
        /**
         * Array of services.
         */
        this.services = [];
        /**
         * Array of loggers.
         */
        this.loggers = [];
        /**
         * Receive handler listener.
         */
        this.receiveHandlerListener = this.receiveHandler.bind(this);
        /**
         * Send handler listener.
         */
        this.sendHandlerListener = this.sendHandler.bind(this);
        /**
         * Error handler listener.
         */
        this.errorHandlerListener = this.errorHandler.bind(this);
        this.filters = new Routing.Router(settings);
        this.processors = new Routing.Router(settings);
    }
    /**
     * Adds a new route handler.
     * @param handler Handler type.
     * @param route Route settings.
     */
    static addRoute(handler, route) {
        let list;
        if (!(list = this.routes.get(handler))) {
            this.routes.set(handler, (list = []));
        }
        list.push(route);
    }
    /**
     * Notify all registered loggers about new requests.
     * @param type Notification type.
     * @param request Request information.
     * @throws Throws an error when the notification type is not valid.
     */
    notifyRequest(type, request) {
        const copy = Object.freeze({ ...request });
        for (const logger of this.loggers) {
            switch (type) {
                case Types.Request.Receive:
                    logger.onReceive(copy);
                    break;
                case Types.Request.Process:
                    logger.onProcess(copy);
                    break;
                case Types.Request.Send:
                    logger.onSend(copy);
                    break;
                case Types.Request.Error:
                    logger.onError(copy);
                    break;
                default:
                    throw new TypeError(`Request type '${type}' doesn't supported.`);
            }
        }
    }
    /**
     * Notify all registered loggers about new actions.
     * @param type Notification type.
     * @param request Request information.
     * @throws Throws an error when the notification type is not valid.
     */
    notifyAction(type) {
        for (const logger of this.loggers) {
            switch (type) {
                case Types.Action.Start:
                    logger.onStart(void 0);
                    break;
                case Types.Action.Stop:
                    logger.onStop(void 0);
                    break;
                default:
                    throw new TypeError(`Action type '${type}' doesn't supported.`);
            }
        }
    }
    /**
     * Performs the specified handler method with the given route match and parameters.
     * @param handler Handler class.
     * @param method Handler method name.
     * @param parameters Handler constructor parameters.
     * @param match Route match.
     * @returns Returns the same value returned by the performed handler method.
     */
    async performHandler(handler, method, parameters, match) {
        let result;
        try {
            result = await new handler(...parameters)[method](match);
        }
        catch (error) {
            match.detail.error = error;
            this.notifyRequest(Types.Request.Error, match.detail);
        }
        finally {
            return result;
        }
    }
    /**
     * Performs all route filters for the specified request with the given variables.
     * @param request Request information.
     * @param variables Request processor variables.
     * @returns Returns true when the request access is granted or false otherwise.
     */
    async performFilters(request, variables) {
        const local = request.environment.local;
        const match = this.filters.match(request.path, request);
        while (request.granted && match.length) {
            request.environment.local = {
                ...variables,
                ...match.variables,
                ...local
            };
            await match.next();
            request.environment.local = local;
        }
        return request.granted || false;
    }
    /**
     * Receiver handler.
     * @param request Request information.
     */
    async receiveHandler(request) {
        this.notifyRequest(Types.Request.Receive, request);
        const local = request.environment.local;
        const match = this.processors.match(request.path, request);
        while (match.length && (await this.performFilters(request, match.variables))) {
            request.environment.local = {
                ...match.variables,
                ...local
            };
            await match.next();
            request.environment.local = local;
        }
        this.notifyRequest(Types.Request.Process, request);
    }
    /**
     * Send handler.
     * @param request Request information.
     */
    async sendHandler(request) {
        this.notifyRequest(Types.Request.Send, request);
    }
    /**
     * Error handler.
     * @param request Request information.
     */
    async errorHandler(request) {
        this.notifyRequest(Types.Request.Error, request);
    }
    /**
     * Filter handler to be inherited and extended.
     * @param match Match information.
     * @param allows Determine whether the filter is allowing the request matching or not.
     * @returns Returns true when the filter handler still allows the request matching or false otherwise.
     */
    async filterHandler(match, allows) {
        return allows;
    }
    /**
     * Process handler to be inherited and extended.
     * @param match Match information.
     * @param callback Callable member.
     */
    async processHandler(match, callback) {
        await callback(match);
    }
    /**
     * Decorates the specified class to be an application dependency.
     * @param settings Dependency settings.
     * @returns Returns the decorator method.
     */
    Dependency(settings) {
        return this.dim.Describe(settings);
    }
    /**
     * Decorates the specified class to be injected by the specified application dependencies.
     * @param list List of dependencies.
     * @returns Returns the decorator method.
     */
    Inject(...list) {
        return this.dim.Inject(...list);
    }
    /**
     * Adds a generic route handler into this application.
     * @param handler Handler class type.
     * @returns Returns the own instance.
     */
    addHandler(handler, ...parameters) {
        if (this.started) {
            throw new Error(`To add new handlers the application must be stopped.`);
        }
        const routes = Main_1.routes.get(handler.prototype.constructor) || [];
        for (const route of routes) {
            switch (route.type) {
                case Types.Route.Filter:
                    this.filters.add({
                        ...route.action,
                        onMatch: async (match) => {
                            const allows = (await this.performHandler(handler, route.method, parameters, match)) === true;
                            match.detail.granted = (await this.filterHandler(match, allows)) && allows === true;
                        }
                    });
                    break;
                case Types.Route.Processor:
                    this.processors.add({
                        ...route.action,
                        exact: route.action.exact === void 0 ? true : route.action.exact,
                        onMatch: async (match) => {
                            const callback = this.performHandler.bind(this, handler, route.method, parameters);
                            await this.processHandler(match, callback);
                        }
                    });
                    break;
                default:
                    throw new TypeError(`Unsupported route type ${route.type}`);
            }
        }
        return this;
    }
    /**
     * Adds a service handler into this application.
     * @param instance Service class type or instance.
     * @returns Returns the service instance.
     */
    addService(service, ...parameters) {
        if (this.started) {
            throw new Error(`To add new services the application must be stopped.`);
        }
        if (service instanceof Function) {
            service = new service(...parameters);
        }
        this.services.push(service);
        return service;
    }
    /**
     * Adds a logger handler into this application.
     * @param logger Logger class type or instance.
     * @returns Returns the logger instance.
     */
    addLogger(logger, ...parameters) {
        if (this.started) {
            throw new Error(`To add new loggers service the application must be stopped.`);
        }
        if (logger instanceof Function) {
            logger = new logger(...parameters);
        }
        this.loggers.push(logger);
        return logger;
    }
    /**
     * Starts the application with all included services.
     * @returns Returns the own instance.
     */
    start() {
        if (this.started) {
            throw new Error(`Application was already started.`);
        }
        this.notifyAction(Types.Action.Start);
        for (const service of this.services) {
            service.onReceive.subscribe(this.receiveHandlerListener);
            service.onSend.subscribe(this.sendHandlerListener);
            service.onError.subscribe(this.errorHandlerListener);
            service.start();
        }
        this.started = true;
        return this;
    }
    /**
     * Stops the application and all included services.
     * @returns Returns the own instance.
     */
    stop() {
        if (!this.started) {
            throw new Error(`Application wasn't started.`);
        }
        for (const service of this.services) {
            service.stop();
            service.onReceive.unsubscribe(this.receiveHandlerListener);
            service.onSend.unsubscribe(this.sendHandlerListener);
            service.onError.unsubscribe(this.errorHandlerListener);
        }
        this.started = false;
        this.notifyAction(Types.Action.Stop);
        return this;
    }
    /**
     * Decorates the specified member to filter an application request.
     * @param action Filter action settings.
     * @returns Returns the decorator method.
     */
    static Filter(action) {
        return (prototype, property, descriptor) => {
            if (!(descriptor.value instanceof Function)) {
                throw new TypeError(`Only methods are allowed as filters.`);
            }
            this.addRoute(prototype.constructor, {
                type: Types.Route.Filter,
                action: action,
                method: property
            });
        };
    }
    /**
     * Decorates the specified member to process an application request.
     * @param action Route action settings.
     * @returns Returns the decorator method.
     */
    static Processor(action) {
        return (prototype, property, descriptor) => {
            if (!(descriptor.value instanceof Function)) {
                throw new TypeError(`Only methods are allowed as processors.`);
            }
            this.addRoute(prototype.constructor, {
                type: Types.Route.Processor,
                action: action,
                method: property
            });
        };
    }
};
/**
 * Global routes.
 */
Main.routes = new WeakMap();
__decorate([
    Class.Private()
], Main.prototype, "started", void 0);
__decorate([
    Class.Private()
], Main.prototype, "dim", void 0);
__decorate([
    Class.Private()
], Main.prototype, "services", void 0);
__decorate([
    Class.Private()
], Main.prototype, "loggers", void 0);
__decorate([
    Class.Private()
], Main.prototype, "filters", void 0);
__decorate([
    Class.Private()
], Main.prototype, "processors", void 0);
__decorate([
    Class.Private()
], Main.prototype, "receiveHandlerListener", void 0);
__decorate([
    Class.Private()
], Main.prototype, "sendHandlerListener", void 0);
__decorate([
    Class.Private()
], Main.prototype, "errorHandlerListener", void 0);
__decorate([
    Class.Private()
], Main.prototype, "notifyRequest", null);
__decorate([
    Class.Private()
], Main.prototype, "notifyAction", null);
__decorate([
    Class.Private()
], Main.prototype, "performHandler", null);
__decorate([
    Class.Private()
], Main.prototype, "performFilters", null);
__decorate([
    Class.Private()
], Main.prototype, "receiveHandler", null);
__decorate([
    Class.Private()
], Main.prototype, "sendHandler", null);
__decorate([
    Class.Private()
], Main.prototype, "errorHandler", null);
__decorate([
    Class.Protected()
], Main.prototype, "filterHandler", null);
__decorate([
    Class.Protected()
], Main.prototype, "processHandler", null);
__decorate([
    Class.Protected()
], Main.prototype, "Dependency", null);
__decorate([
    Class.Protected()
], Main.prototype, "Inject", null);
__decorate([
    Class.Protected()
], Main.prototype, "addHandler", null);
__decorate([
    Class.Protected()
], Main.prototype, "addService", null);
__decorate([
    Class.Protected()
], Main.prototype, "addLogger", null);
__decorate([
    Class.Protected()
], Main.prototype, "start", null);
__decorate([
    Class.Protected()
], Main.prototype, "stop", null);
__decorate([
    Class.Private()
], Main, "routes", void 0);
__decorate([
    Class.Private()
], Main, "addRoute", null);
__decorate([
    Class.Public()
], Main, "Filter", null);
__decorate([
    Class.Public()
], Main, "Processor", null);
Main = Main_1 = __decorate([
    Class.Describe()
], Main);
exports.Main = Main;
//# sourceMappingURL=main.js.map
}},
"@singleware/application/types/action":{pack:false, invoke:function(module, exports, require){
"use strict";
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Action types.
 */
var Action;
(function (Action) {
    Action["Start"] = "start";
    Action["Stop"] = "stop";
})(Action = exports.Action || (exports.Action = {}));
//# sourceMappingURL=action.js.map
}},
"@singleware/application/types/index":{pack:false, invoke:function(module, exports, require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
var route_1 = require("./route");
exports.Route = route_1.Route;
var action_1 = require("./action");
exports.Action = action_1.Action;
var request_1 = require("./request");
exports.Request = request_1.Request;
//# sourceMappingURL=index.js.map
}},
"@singleware/application/types":{pack:true, invoke:function(module, exports, require){
Object.assign(exports, require('./index'));
}},
"@singleware/application/types/request":{pack:false, invoke:function(module, exports, require){
"use strict";
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Request types.
 */
var Request;
(function (Request) {
    Request["Receive"] = "receive";
    Request["Process"] = "process";
    Request["Send"] = "send";
    Request["Error"] = "error";
})(Request = exports.Request || (exports.Request = {}));
//# sourceMappingURL=request.js.map
}},
"@singleware/application/types/route":{pack:false, invoke:function(module, exports, require){
"use strict";
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Route types.
 */
var Route;
(function (Route) {
    Route["Filter"] = "filter";
    Route["Processor"] = "processor";
})(Route = exports.Route || (exports.Route = {}));
//# sourceMappingURL=route.js.map
}},
"@singleware/jsx/helpers/browser":{pack:false, invoke:function(module, exports, require){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
const Class = require("@singleware/class");
const common_1 = require("./common");
/**
 * Provides methods to help Browser DOM.
 */
let Helper = class Helper extends Class.Null {
    /**
     * Assign the specified properties into the given element.
     * @param element Element instance.
     * @param properties Element properties.
     */
    static assignProperties(element, properties) {
        for (const property in properties) {
            if (properties[property] !== void 0) {
                if (property in element) {
                    element[property] = properties[property];
                }
                else {
                    const event = property.toLowerCase();
                    if (this.eventMap.includes(event)) {
                        element.addEventListener(event.substr(2), properties[property]);
                    }
                    else {
                        element.setAttribute(property, properties[property]);
                    }
                }
            }
        }
    }
    /**
     * Creates a native element with the specified type.
     * @param type Element type.
     * @param properties Element properties.
     * @param children Children list.
     * @returns Returns the element instance.
     */
    static createFromElement(type, properties, ...children) {
        const element = this.append(document.createElement(type), ...children);
        if (properties) {
            this.assignProperties(element, properties);
        }
        return element;
    }
    /**
     * Decorates the specified class to be a custom element.
     * @param name Tag name.
     * @returns Returns the decorator method.
     */
    static Describe(name) {
        return (type) => {
            window.customElements.define(name, type);
            return type;
        };
    }
    /**
     * Creates an element by the specified type.
     * @param type Component type or native element tag name.
     * @param properties Element properties.
     * @param children Element children.
     * @throws Throws a type error when the element or component type is unsupported.
     */
    static create(type, properties, ...children) {
        if (type instanceof Function) {
            return new type(properties, children).element;
        }
        else if (typeof type === 'string') {
            return this.createFromElement(type, properties, ...children);
        }
        else {
            throw new TypeError(`Unsupported element or component type "${type}"`);
        }
    }
    /**
     * Appends the specified children into the given parent element.
     * @param parent Parent element.
     * @param children Children elements.
     * @returns Returns the parent element.
     * @throws Throws a type error when the child type is unsupported.
     */
    static append(parent, ...children) {
        for (const child of children) {
            if (child instanceof Node) {
                parent.appendChild(child);
            }
            else if (child instanceof NodeList || child instanceof Array) {
                this.append(parent, ...child);
            }
            else if (typeof child === 'string' ||
                typeof child === 'number' ||
                (((child instanceof Function && child.toString !== Object.toString) ||
                    (child instanceof Object && child.toString !== Object.prototype.toString)) &&
                    child.toString instanceof Function)) {
                this.renderer.innerHTML = child.toString();
                this.append(parent, ...this.renderer.childNodes);
            }
            else if (child) {
                const node = child.element;
                if (node instanceof Node) {
                    this.append(parent, node);
                }
                else if (node instanceof Array) {
                    this.append(parent, ...node);
                }
                else {
                    throw new TypeError(`Unsupported child type "${child}"`);
                }
            }
        }
        return parent;
    }
    /**
     * Clear all children of the specified element.
     * @param element Element instance.
     * @returns Returns the cleared element instance.
     */
    static clear(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
        return element;
    }
    /**
     * Unwraps the specified element into its parent.
     * @param element Element instance.
     * @throws Throws an error when the specified element has no parent.
     */
    static unwrap(element) {
        const parent = element.parentNode;
        if (!parent) {
            throw new Error(`The specified element has no parent.`);
        }
        while (element.firstChild) {
            parent.insertBefore(element.firstChild, element);
        }
        element.remove();
    }
    /**
     * Determines whether the specified node is child of the given parent element.
     * @param parent Parent element.
     * @param node Child node.
     * @returns Returns true when the specified node is child of the given parent, false otherwise.
     */
    static childOf(parent, node) {
        while (node && node.parentElement) {
            if (node.parentElement === parent) {
                return true;
            }
            node = node.parentElement;
        }
        return false;
    }
    /**
     * Escape any special HTML characters in the given input string.
     * @param input Input string.
     * @returns Returns the escaped input string.
     */
    static escape(input) {
        return common_1.Common.escape(input);
    }
};
/**
 * Known events to automate listeners.
 */
Helper.eventMap = [
    // Form events
    'onblur',
    'onchange',
    'oncontextmenu',
    'onfocus',
    'oninput',
    'oninvalid',
    'onreset',
    'onsearch',
    'onselect',
    'onsubmit',
    // Keyboard events
    'onkeydown',
    'onkeypress',
    'onkeyup',
    // Mouse events
    'onclick',
    'ondblclick',
    'onmousedown',
    'onmousemove',
    'onmouseout',
    'onmouseover',
    'onmouseup',
    'onmousewheel',
    'onwheel',
    // Drag events
    'ondrag',
    'ondragend',
    'ondragenter',
    'ondragleave',
    'ondragover',
    'ondragstart',
    'ondrop',
    'onscroll',
    // Clipboard events
    'oncopy',
    'oncut',
    'onpaste',
    // Media events
    'onabort',
    'oncanplay',
    'oncanplaythrough',
    'oncuechange',
    'ondurationchange',
    'onemptied',
    'onended',
    'onerror',
    'onloadeddata',
    'onloadedmetadata',
    'onloadstart',
    'onpause',
    'onplay',
    'onplaying',
    'onprogress',
    'onratechange',
    'onseeked',
    'onseeking',
    'onstalled',
    'onsuspend',
    'ontimeupdate',
    'onvolumechange',
    'onwaiting',
    // Misc events
    'ontoggle',
    'onslotchange',
];
/**
 * Renderer for temp elements.
 */
Helper.renderer = document.createElement('body');
__decorate([
    Class.Private()
], Helper, "eventMap", void 0);
__decorate([
    Class.Private()
], Helper, "renderer", void 0);
__decorate([
    Class.Private()
], Helper, "assignProperties", null);
__decorate([
    Class.Private()
], Helper, "createFromElement", null);
__decorate([
    Class.Public()
], Helper, "Describe", null);
__decorate([
    Class.Public()
], Helper, "create", null);
__decorate([
    Class.Public()
], Helper, "append", null);
__decorate([
    Class.Public()
], Helper, "clear", null);
__decorate([
    Class.Public()
], Helper, "unwrap", null);
__decorate([
    Class.Public()
], Helper, "childOf", null);
__decorate([
    Class.Public()
], Helper, "escape", null);
Helper = __decorate([
    Class.Describe()
], Helper);
exports.Helper = Helper;

}},
"@singleware/jsx/helpers/common":{pack:false, invoke:function(module, exports, require){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
const Class = require("@singleware/class");
/**
 * Provides any common methods to help Browser and Text DOM.
 */
let Common = class Common extends Class.Null {
    /**
     * Escape any special HTML character in the given input string.
     * @param input Input string.
     * @returns Returns the escaped input string.
     */
    static escape(input) {
        return input.replace(/\"|\'|\<|\>|\&/gi, (match) => {
            switch (match) {
                case '"':
                    return '&quot;';
                case "'":
                    return '&39;';
                case '<':
                    return '&lt;';
                case '>':
                    return '&gt;';
                case '&':
                    return '&amp;';
            }
            return match;
        });
    }
};
__decorate([
    Class.Public()
], Common, "escape", null);
Common = __decorate([
    Class.Describe()
], Common);
exports.Common = Common;

}},
"@singleware/jsx/helpers/index":{pack:false, invoke:function(module, exports, require){
"use strict";
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
Object.defineProperty(exports, "__esModule", { value: true });
// Imported aliases.
const Browser = require("./browser");
const Text = require("./text");
// Exported aliases.
exports.Browser = Browser.Helper;
exports.Text = Text.Helper;

}},
"@singleware/jsx/helpers":{pack:true, invoke:function(module, exports, require){
Object.assign(exports, require('./index'));
}},
"@singleware/jsx/helpers/text":{pack:false, invoke:function(module, exports, require){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
const Class = require("@singleware/class");
const common_1 = require("./common");
/**
 * Provides methods to help Text DOM.
 */
let Helper = class Helper extends Class.Null {
    /**
     * Gets a string with all given properties.
     * @param properties Element properties.
     * @returns Returns the element properties string.
     */
    static getProperties(properties) {
        let list = [];
        for (const property in properties) {
            if (properties[property] !== void 0) {
                list.push(`${property.toLowerCase()}="${this.escape(properties[property])}"`);
            }
        }
        return list.join(' ');
    }
    /**
     * Gets a string with all given children.
     * @param children Children list.
     * @returns Returns the children list string.
     * @throws Throws an error when the child type is not supported.
     */
    static getChildren(children) {
        let output = '';
        for (const child of children) {
            if (typeof child === 'string' || typeof child === 'number') {
                output += child;
            }
            else if (child instanceof Array) {
                output += this.getChildren(child);
            }
            else if (child) {
                const node = child.element;
                if (node) {
                    output += this.getChildren([node]);
                }
                else {
                    throw new TypeError(`Unsupported child type "${child}"`);
                }
            }
        }
        return output;
    }
    /**
     * Decorates the specified class to be a custom element.
     * @param name Tag name.
     * @returns Returns the decorator method.
     */
    static Describe(name) {
        return (type) => {
            return type;
        };
    }
    /**
     * Creates an element with the specified type.
     * @param type Component type or native element tag name.
     * @param properties Element properties.
     * @param children Element children.
     * @throws Throws an error when the element or component type is not supported.
     */
    static create(type, properties, ...children) {
        if (type instanceof Function) {
            return new type(properties, children).element;
        }
        else if (typeof type === 'string') {
            const attributes = this.getProperties(properties);
            const content = this.getChildren(children);
            if (content.length) {
                return `<${type}${attributes.length ? ` ${attributes}` : ''}>${content}</${type}>`;
            }
            else {
                return `<${type}${attributes.length ? ` ${attributes}` : ''}/>`;
            }
        }
        else {
            throw new TypeError(`Unsupported element or component type "${type}"`);
        }
    }
    /**
     * Appends the specified children into the given parent element. (Not supported in text mode)
     * @param parent Parent element.
     * @param children Children elements.
     * @returns Returns the parent element.
     * @throws Throws a type error when the child type is unsupported.
     */
    static append(parent, ...children) {
        throw new Error(`Operation not supported in text mode.`);
    }
    /**
     * Clear all children of the specified element. (Not supported in text mode)
     * @param element Element instance.
     * @returns Returns the cleared element instance.
     */
    static clear(element) {
        throw new Error(`Operation not supported in text mode.`);
    }
    /**
     * Unwraps the specified element into its parent.
     * @param element Element instance.
     * @throws Throws an error when the specified element has no parent.
     */
    static unwrap(element) {
        throw new Error(`Operation not supported in text mode.`);
    }
    /**
     * Determines whether the specified node is a child of the given parent element. (Not supported in text mode)
     * @param parent Parent element.
     * @param node Child node.
     * @returns Returns true when the specified node is child of the given parent, false otherwise.
     */
    static childOf(parent, node) {
        throw new Error(`Operation not supported in text mode.`);
    }
    /**
     * Escape any special HTML characters in the given input string.
     * @param input Input string.
     * @returns Returns the escaped input string.
     */
    static escape(input) {
        return common_1.Common.escape(input);
    }
};
__decorate([
    Class.Private()
], Helper, "getProperties", null);
__decorate([
    Class.Private()
], Helper, "getChildren", null);
__decorate([
    Class.Public()
], Helper, "Describe", null);
__decorate([
    Class.Public()
], Helper, "create", null);
__decorate([
    Class.Public()
], Helper, "append", null);
__decorate([
    Class.Public()
], Helper, "clear", null);
__decorate([
    Class.Public()
], Helper, "unwrap", null);
__decorate([
    Class.Public()
], Helper, "childOf", null);
__decorate([
    Class.Public()
], Helper, "escape", null);
Helper = __decorate([
    Class.Describe()
], Helper);
exports.Helper = Helper;

}},
"@singleware/jsx/index":{pack:false, invoke:function(module, exports, require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Current helper according to the environment.
 */
const Helper = require(`./helpers/${typeof window !== 'undefined' ? 'browser' : 'text'}`).Helper;
/**
 * Decorates the specified class to be a custom element.
 * @param name Tag name.
 * @returns Returns the decorator method.
 */
exports.Describe = (name) => Helper.Describe(name);
/**
 * Creates an element by the specified type.
 * @param type Component type or native element tag name.
 * @param properties Element properties.
 * @param children Element children.
 * @throws Throws a type error when the element or component type is unsupported.
 */
exports.create = (type, properties, ...children) => Helper.create(type, properties, ...children);
/**
 * Appends the specified children into the given parent element.
 * @param parent Parent element.
 * @param children Children elements.
 * @returns Returns the parent element.
 * @throws Throws a type error when the child type is unsupported.
 */
exports.append = (parent, ...children) => Helper.append(parent, ...children);
/**
 * Clear all children of the specified element.
 * @param element Element instance.
 * @returns Returns the cleared element instance.
 */
exports.clear = (element) => Helper.clear(element);
/**
 * Unwraps the specified element into its parent.
 * @param element Element instance.
 * @throws Throws an error when the specified element has no parent.
 */
exports.unwrap = (element) => Helper.unwrap(element);
/**
 * Determines whether the specified node is child of the given parent element.
 * @param parent Parent element.
 * @param node Child node.
 * @returns Returns true when the specified node is child of the given parent, false otherwise.
 */
exports.childOf = (parent, node) => Helper.childOf(parent, node);
/**
 * Escape any special HTML character in the given input string.
 * @param input Input string.
 * @returns Returns the escaped input string.
 */
exports.escape = (input) => Helper.escape(input);

}},
"@singleware/jsx":{pack:true, invoke:function(module, exports, require){
Object.assign(exports, require('./index'));
}},
"@singleware/path/helper":{pack:false, invoke:function(module, exports, require){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
const Class = require("@singleware/class");
/**
 * Path helper class.
 */
let Helper = class Helper extends Class.Null {
    /**
     * Normalizes the specified path.
     * @param path Path to be normalized.
     * @return Returns the normalized path.
     */
    static normalize(path) {
        if (path.length > 0) {
            const pieces = path.split(this.separator);
            const length = pieces.length;
            const newer = [];
            let last;
            for (let offset = 0; offset < length; ++offset) {
                const part = pieces[offset];
                if (newer.length === 0) {
                    newer.push((last = part));
                }
                else if (part !== '.') {
                    if (part === '..' && part !== last) {
                        if (last !== '') {
                            newer.pop();
                            last = newer[newer.length - 1];
                        }
                    }
                    else if (part.length > 0) {
                        if (last === '.') {
                            newer[newer.length - 1] = last = part;
                        }
                        else {
                            newer.push((last = part));
                        }
                    }
                    else if (offset + 1 === length) {
                        newer.push((last = part));
                    }
                }
            }
            return newer.join(this.separator);
        }
        return '.';
    }
    /**
     * Join the specified path list.
     * @param paths Path list.
     * @returns Returns the joined path.
     */
    static join(...paths) {
        return this.normalize(paths.filter((value) => value.length).join(this.separator));
    }
    /**
     * Resolves the last absolute path.
     * @param paths Path list.
     * @returns Returns the resolved path.
     */
    static resolve(...paths) {
        let resolved = '';
        for (const path of paths) {
            resolved = path[0] === this.separator ? this.normalize(path) : this.join(resolved, path);
        }
        return resolved;
    }
    /**
     * Gets the directory path of the specified path.
     * @param path Path for extraction.
     * @returns Returns the directory path.
     */
    static dirname(path) {
        const normalized = this.normalize(path);
        return normalized.substr(0, normalized.lastIndexOf(this.separator));
    }
    /**
     * Gets the directory name of the specified path.
     * @param path Path for extraction.
     * @returns Returns the directory name.
     */
    static basename(path) {
        const normalized = this.normalize(path);
        return normalized.substr(normalized.lastIndexOf(this.separator) + 1);
    }
    /**
     * Gets the extension name of the specified path.
     * @param path Path for extraction.
     * @returns Returns the extension name.
     */
    static extname(path) {
        const base = this.basename(path);
        return base[0] === '.' ? '' : base.substr(base.lastIndexOf('.') + 1);
    }
};
/**
 * Path separator.
 */
Helper.separator = '/';
__decorate([
    Class.Public()
], Helper, "separator", void 0);
__decorate([
    Class.Public()
], Helper, "normalize", null);
__decorate([
    Class.Public()
], Helper, "join", null);
__decorate([
    Class.Public()
], Helper, "resolve", null);
__decorate([
    Class.Public()
], Helper, "dirname", null);
__decorate([
    Class.Public()
], Helper, "basename", null);
__decorate([
    Class.Public()
], Helper, "extname", null);
Helper = __decorate([
    Class.Describe()
], Helper);
exports.Helper = Helper;

}},
"@singleware/path/index":{pack:false, invoke:function(module, exports, require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
const helper_1 = require("./helper");
/**
 * Normalizes the specified path.
 * @param path Path to be normalized.
 * @return Returns the normalized path.
 */
exports.normalize = (path) => helper_1.Helper.normalize(path);
/**
 * Join the specified path list.
 * @param paths Path list.
 * @returns Returns the joined path.
 */
exports.join = (...paths) => helper_1.Helper.join(...paths);
/**
 * Resolves the last absolute path.
 * @param paths Path list.
 * @returns Returns the resolved path.
 */
exports.resolve = (...paths) => helper_1.Helper.resolve(...paths);
/**
 * Gets the directory path of the specified path.
 * @param path Path for extraction.
 * @returns Returns the directory path.
 */
exports.dirname = (path) => helper_1.Helper.dirname(path);
/**
 * Gets the directory name of the specified path.
 * @param path Path for extraction.
 * @returns Returns the directory name.
 */
exports.basename = (path) => helper_1.Helper.basename(path);
/**
 * Gets the extension name of the specified path.
 * @param path Path for extraction.
 * @returns Returns the extension name.
 */
exports.extname = (path) => helper_1.Helper.extname(path);

}},
"@singleware/path":{pack:true, invoke:function(module, exports, require){
Object.assign(exports, require('./index'));
}},
"source/aliases":{pack:false, invoke:function(module, exports, require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Match = void 0;
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
const Application = require("@singleware/application");
/**
 * Application match.
 */
exports.Match = Application.Match;
//# sourceMappingURL=aliases.js.map
}},
"source/helper":{pack:false, invoke:function(module, exports, require){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Helper = void 0;
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
const Class = require("@singleware/class");
/**
 * Request helper class.
 */
let Helper = class Helper extends Class.Null {
    /**
     * Get a new map containing all search parameters from the specified search string.
     * @param search Search string.
     * @returns Returns the new map.
     */
    static parseURLSearch(search) {
        const map = {};
        for (const entry of search.split('&')) {
            const [key, value] = entry.split('=');
            const name = key.trim();
            if (name.length > 0) {
                const decoded = decodeURIComponent(value.trim());
                const current = map[name];
                if (current !== void 0) {
                    if (current instanceof Array) {
                        current.push(decoded || true);
                    }
                    else {
                        map[name] = [current, decoded || true];
                    }
                }
                else {
                    map[name] = decoded || true;
                }
            }
        }
        return map;
    }
};
__decorate([
    Class.Public()
], Helper, "parseURLSearch", null);
Helper = __decorate([
    Class.Describe()
], Helper);
exports.Helper = Helper;
//# sourceMappingURL=helper.js.map
}},
"source/index":{pack:false, invoke:function(module, exports, require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Services = exports.Processor = exports.Filter = void 0;
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
var main_1 = require("./main");
Object.defineProperty(exports, "Main", { enumerable: true, get: function () { return main_1.Main; } });
var aliases_1 = require("./aliases");
Object.defineProperty(exports, "Match", { enumerable: true, get: function () { return aliases_1.Match; } });
// Declarations.
const Application = require("@singleware/application");
/**
 * Decorates the specified member to filter an application request. (Alias for Main.Filter)
 * @param action Filter action settings.
 * @returns Returns the decorator method.
 */
exports.Filter = (action) => Application.Main.Filter(action);
/**
 * Decorates the specified member to process an application request. (Alias for Main.Processor)
 * @param action Route action settings.
 * @returns Returns the decorator method.
 */
exports.Processor = (action) => Application.Main.Processor(action);
// Imported aliases.
const Services = require("./services");
/**
 * Services namespace.
 */
exports.Services = Services;
//# sourceMappingURL=index.js.map
}},
"source":{pack:true, invoke:function(module, exports, require){
Object.assign(exports, require('./index'));
}},
"source/main":{pack:false, invoke:function(module, exports, require){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Main = void 0;
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
const Class = require("@singleware/class");
const Application = require("@singleware/application");
const JSX = require("@singleware/jsx");
/**
 * Frontend main application class.
 */
let Main = class Main extends Application.Main {
    /**
     * Default constructor.
     * @param settings Application settings.
     */
    constructor(settings) {
        super({ separator: '/', variable: /^\{([a-zA-Z_0-9]+)\}$/ });
        /**
         * Current script list.
         */
        this.scriptList = [];
        /**
         * Current style list.
         */
        this.styleList = [];
        this.settings = settings;
    }
    /**
     * Clear the specified list of elements by removing them from their parents.
     * @param list List of elements.
     */
    clearElements(list) {
        while (list.length) {
            list.pop().remove();
        }
    }
    /**
     * Set any output script from the specified output in the current document.
     * @param output Output information.
     */
    setScripts(output) {
        this.clearElements(this.scriptList);
        if (output.scripts) {
            for (const url of output.scripts) {
                const script = JSX.create('script', { src: url });
                JSX.append(document.head, script);
                this.scriptList.push(script);
            }
        }
    }
    /**
     * Set any output style from the specified output in the current document.
     * @param output Output information.
     */
    setStyles(output) {
        this.clearElements(this.styleList);
        if (output.styles) {
            for (const url of output.styles) {
                const style = JSX.create('link', { href: url, rel: 'stylesheet', type: 'text/css' });
                JSX.append(document.head, style);
                this.styleList.push(style);
            }
        }
    }
    /**
     * Set any defined title from the specified output in the current document.
     * @param output Output information.
     */
    setTitle(output) {
        if (output.subtitle) {
            if (this.settings.title.prefix) {
                document.title = `${this.settings.title.text}${this.settings.title.separator}${output.subtitle}`;
            }
            else {
                document.title = `${output.subtitle}${this.settings.title.separator}${this.settings.title.text}`;
            }
        }
        else {
            document.title = this.settings.title.text;
        }
    }
    /**
     * Process event handler.
     * @param match Matched routes.
     * @param callback Handler callback.
     */
    async processHandler(match, callback) {
        const request = match.detail;
        await super.processHandler(match, callback);
        if (request.error) {
            throw request.error;
        }
        else {
            this.setTitle(request.output);
            this.setScripts(request.output);
            this.setStyles(request.output);
            JSX.append(JSX.clear(this.settings.body || document.body), request.output.content);
            if (request.environment.local.state) {
                history.pushState(match.variables.state, document.title, match.detail.path);
            }
        }
    }
};
__decorate([
    Class.Private()
], Main.prototype, "settings", void 0);
__decorate([
    Class.Private()
], Main.prototype, "scriptList", void 0);
__decorate([
    Class.Private()
], Main.prototype, "styleList", void 0);
__decorate([
    Class.Private()
], Main.prototype, "clearElements", null);
__decorate([
    Class.Private()
], Main.prototype, "setScripts", null);
__decorate([
    Class.Private()
], Main.prototype, "setStyles", null);
__decorate([
    Class.Private()
], Main.prototype, "setTitle", null);
__decorate([
    Class.Protected()
], Main.prototype, "processHandler", null);
Main = __decorate([
    Class.Describe()
], Main);
exports.Main = Main;
//# sourceMappingURL=main.js.map
}},
"source/services/client":{pack:false, invoke:function(module, exports, require){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
const Class = require("@singleware/class");
const Observable = require("@singleware/observable");
const helper_1 = require("../helper");
const navigator_1 = require("./navigator");
/**
 * Front-end client class.
 */
let Client = class Client extends Class.Null {
    /**
     * Default constructor.
     * @param settings Application settings.
     */
    constructor(settings) {
        super();
        /**
         * Receive subject instance.
         */
        this.receiveSubject = new Observable.Subject();
        /**
         * Send subject instance.
         */
        this.sendSubject = new Observable.Subject();
        /**
         * Error subject instance.
         */
        this.errorSubject = new Observable.Subject();
        this.settings = settings;
        this.navigation = new navigator_1.Navigator(this, settings.path || location.pathname, settings.search || helper_1.Helper.parseURLSearch(document.location.search.substr(1)));
    }
    /**
     * Gets the current opened path.
     */
    get path() {
        return this.navigation.path;
    }
    /**
     * Gets the navigator instance.
     */
    get navigator() {
        return this.navigation;
    }
    /**
     * Receive request event.
     */
    get onReceive() {
        return this.receiveSubject;
    }
    /**
     * Send response event.
     */
    get onSend() {
        return this.sendSubject;
    }
    /**
     * Error response event.
     */
    get onError() {
        return this.errorSubject;
    }
    /**
     * Starts the service.
     */
    start() {
        this.navigation.reload();
    }
    /**
     * Stops the service.
     */
    stop() { }
};
__decorate([
    Class.Private()
], Client.prototype, "settings", void 0);
__decorate([
    Class.Private()
], Client.prototype, "navigation", void 0);
__decorate([
    Class.Private()
], Client.prototype, "receiveSubject", void 0);
__decorate([
    Class.Private()
], Client.prototype, "sendSubject", void 0);
__decorate([
    Class.Private()
], Client.prototype, "errorSubject", void 0);
__decorate([
    Class.Public()
], Client.prototype, "path", null);
__decorate([
    Class.Public()
], Client.prototype, "navigator", null);
__decorate([
    Class.Public()
], Client.prototype, "onReceive", null);
__decorate([
    Class.Public()
], Client.prototype, "onSend", null);
__decorate([
    Class.Public()
], Client.prototype, "onError", null);
__decorate([
    Class.Public()
], Client.prototype, "start", null);
__decorate([
    Class.Public()
], Client.prototype, "stop", null);
Client = __decorate([
    Class.Describe()
], Client);
exports.Client = Client;
//# sourceMappingURL=client.js.map
}},
"source/services/index":{pack:false, invoke:function(module, exports, require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
var client_1 = require("./client");
Object.defineProperty(exports, "Client", { enumerable: true, get: function () { return client_1.Client; } });
var navigator_1 = require("./navigator");
Object.defineProperty(exports, "Navigator", { enumerable: true, get: function () { return navigator_1.Navigator; } });
//# sourceMappingURL=index.js.map
}},
"source/services":{pack:true, invoke:function(module, exports, require){
Object.assign(exports, require('./index'));
}},
"source/services/navigator":{pack:false, invoke:function(module, exports, require){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Navigator = void 0;
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
const Class = require("@singleware/class");
const Path = require("@singleware/path");
const helper_1 = require("../helper");
/**
 * Front-end navigator class.
 */
let Navigator = class Navigator extends Class.Null {
    /**
     * Default constructor.
     * @param client Client instance.
     * @param path Initial path.
     * @param search Initial search.
     */
    constructor(client, path, search) {
        super();
        this.client = client;
        this.currentPath = path;
        this.currentSearch = search || {};
        globalThis.addEventListener('popstate', this.popStateHandler.bind(this));
    }
    /**
     * Renders the specified path according to the given state.
     * @param path Path to be rendered.
     * @param search Search arguments.
     * @param state Determines whether the renderer will preserves the current state.
     */
    renderPath(path, search, state) {
        this.client.onReceive.notifyAll({
            path: path,
            input: {
                search: search
            },
            output: {},
            environment: {
                local: {
                    state: state
                },
                shared: {}
            },
            granted: true
        });
    }
    /**
     * Pop State, event handler.
     */
    popStateHandler() {
        this.currentPath = document.location.pathname;
        this.currentSearch = helper_1.Helper.parseURLSearch(document.location.search.substr(1));
        this.renderPath(this.currentPath, this.currentSearch, false);
    }
    /**
     * Gets the current path.
     */
    get path() {
        return this.currentPath;
    }
    /**
     * Gets the current search.
     */
    get search() {
        return this.currentSearch;
    }
    /**
     * Opens the specified path.
     * @param path Path to be opened.
     * @param search Search arguments.
     */
    open(path, search) {
        this.currentPath = Path.resolve(Path.dirname(this.currentPath), path);
        this.currentSearch = search || {};
        this.renderPath(this.currentPath, this.currentSearch, true);
    }
    /**
     * Reopens the current path.
     */
    reload() {
        this.renderPath(this.currentPath, this.currentSearch, false);
    }
};
__decorate([
    Class.Private()
], Navigator.prototype, "client", void 0);
__decorate([
    Class.Private()
], Navigator.prototype, "currentPath", void 0);
__decorate([
    Class.Private()
], Navigator.prototype, "currentSearch", void 0);
__decorate([
    Class.Private()
], Navigator.prototype, "renderPath", null);
__decorate([
    Class.Private()
], Navigator.prototype, "popStateHandler", null);
__decorate([
    Class.Public()
], Navigator.prototype, "path", null);
__decorate([
    Class.Public()
], Navigator.prototype, "search", null);
__decorate([
    Class.Public()
], Navigator.prototype, "open", null);
__decorate([
    Class.Public()
], Navigator.prototype, "reload", null);
Navigator = __decorate([
    Class.Describe()
], Navigator);
exports.Navigator = Navigator;
//# sourceMappingURL=navigator.js.map
}},
"./browser":{pack:false, invoke:function(module, exports, require){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
const Class = require("@singleware/class");
const Frontend = require("../../source");
const handler_1 = require("./handler");
/**
 * Browser client, example class.
 */
let Example = class Example extends Frontend.Main {
    /**
     * Default constructor.
     */
    constructor() {
        super({
            title: {
                text: 'Example',
                separator: ' - '
            }
        });
        // Add the client service.
        const client = this.addService(new Frontend.Services.Client({}));
        // Add the page handler.
        this.addHandler(handler_1.Handler, client.navigator);
        // Automatic start.
        this.start();
    }
};
Example = __decorate([
    Class.Describe()
], Example);
// Starts the application.
const instance = new Example();
//# sourceMappingURL=browser.js.map
}},
"./handler":{pack:false, invoke:function(module, exports, require){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Handler = void 0;
/*!
 * Copyright (C) 2018-2019 Silas B. Domingos
 * This source code is licensed under the MIT License as described in the file LICENSE.
 */
const Class = require("@singleware/class");
const JSX = require("@singleware/jsx");
const Frontend = require("../../source");
/**
 * Default handler, example class.
 */
let Handler = class Handler extends Class.Null {
    /**
     * Default constructor.
     * @param client Client instance.
     */
    constructor(navigator) {
        super();
        this.navigator = navigator;
    }
    /**
     * Default page processor.
     * @param match Route match.
     */
    async defaultProcessor(match) {
        const output = match.detail.output;
        output.subtitle = 'Home';
        output.styles = ['/home.css'];
        output.scripts = ['/home.js'];
        output.content = (JSX.create("div", null,
            JSX.create("h1", null, "Home page"),
            JSX.create("nav", null,
                JSX.create("a", { onClick: () => this.navigator.open('/home') }, "Home"),
                " | ",
                JSX.create("a", { onClick: () => this.navigator.open('/about') }, "About"))));
    }
    /**
     * About page processor.
     * @param match Route match.
     */
    async aboutProcessor(match) {
        const output = match.detail.output;
        output.subtitle = 'About';
        output.styles = ['/about.css'];
        output.scripts = ['/about.js'];
        output.content = (JSX.create("div", null,
            JSX.create("h1", null, "About page"),
            JSX.create("nav", null,
                JSX.create("a", { onClick: () => this.navigator.open('/home') }, "Home"),
                " | ",
                JSX.create("a", { onClick: () => this.navigator.open('/about') }, "About"))));
    }
};
__decorate([
    Class.Private()
], Handler.prototype, "navigator", void 0);
__decorate([
    Class.Public(),
    Frontend.Processor({ path: '/' }),
    Frontend.Processor({ path: '/home' })
], Handler.prototype, "defaultProcessor", null);
__decorate([
    Class.Public(),
    Frontend.Processor({ path: '/about' })
], Handler.prototype, "aboutProcessor", null);
Handler = __decorate([
    Class.Describe()
], Handler);
exports.Handler = Handler;
//# sourceMappingURL=handler.js.map
}}});
})(Loader || (Loader = {}));
