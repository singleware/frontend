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