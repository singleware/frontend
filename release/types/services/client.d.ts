import * as Class from '@singleware/class';
import * as Observable from '@singleware/observable';
import * as Application from '@singleware/application';
import * as Types from '../types';
import { Input } from '../input';
import { Output } from '../output';
import { Settings } from './settings';
import { Navigator } from './navigator';
/**
 * Front-end client class.
 */
export declare class Client extends Class.Null implements Application.Service<Input, Output> {
    /**
     * Service settings.
     */
    private settings;
    /**
     * Navigator instance.
     */
    private navigation;
    /**
     * Receive subject instance.
     */
    private receiveSubject;
    /**
     * Send subject instance.
     */
    private sendSubject;
    /**
     * Error subject instance.
     */
    private errorSubject;
    /**
     * Default constructor.
     * @param settings Application settings.
     */
    constructor(settings: Settings);
    /**
     * Gets the current opened path.
     */
    readonly path: string;
    /**
     * Gets the navigator instance.
     */
    readonly navigator: Navigator;
    /**
     * Receive request event.
     */
    readonly onReceive: Observable.Subject<Types.Request>;
    /**
     * Send response event.
     */
    readonly onSend: Observable.Subject<Types.Request>;
    /**
     * Error response event.
     */
    readonly onError: Observable.Subject<Types.Request>;
    /**
     * Starts the service.
     */
    start(): void;
    /**
     * Stops the service.
     */
    stop(): void;
}
