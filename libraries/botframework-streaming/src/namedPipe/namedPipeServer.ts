/**
 * @module botframework-streaming
 */
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { ProtocolAdapter } from '../protocolAdapter';
import { RequestHandler } from '../requestHandler';
import { StreamingRequest } from '../streamingRequest';
import { RequestManager } from '../payloads';
import { PayloadReceiver, PayloadSender } from '../payloadTransport';
import { NamedPipeTransport } from './namedPipeTransport';
import { INodeServer, INodeSocket, IStreamingTransportServer, IReceiveResponse } from '../interfaces';
import { createNodeServer } from '../utilities/createNodeServer';

/**
 * Streaming transport server implementation that uses named pipes for inter-process communication.
 */
export class NamedPipeServer implements IStreamingTransportServer {
    private _outgoingServer: INodeServer;
    private _incomingServer: INodeServer;
    private readonly _baseName: string;
    private readonly _requestHandler: RequestHandler;
    private readonly _sender: PayloadSender;
    private readonly _receiver: PayloadReceiver;
    private readonly _requestManager: RequestManager;
    private readonly _protocolAdapter: ProtocolAdapter;
    private readonly _autoReconnect: boolean;
    private _isDisconnecting: boolean;

    /**
     * Creates a new instance of the [NamedPipeServer](xref:botframework-streaming.NamedPipeServer) class.
     *
     * @param baseName The named pipe to connect to.
     * @param requestHandler Optional [RequestHandler](xref:botframework-streaming.RequestHandler) to process incoming messages received by this client.
     * @param autoReconnect Optional setting to determine if the client should attempt to reconnect automatically on disconnection events. Defaults to true.
     * @param warnIfPipeUnavailable Optional setting to not throw EADDRINUSE errors. Defaults to false.
     */
    public constructor(
        baseName: string,
        requestHandler?: RequestHandler,
        autoReconnect = true,
        private readonly warnIfPipeUnavailable = false) {
        if (!baseName) {
            throw new TypeError('NamedPipeServer: Missing baseName parameter');
        }

        this._baseName = baseName;
        this._requestHandler = requestHandler;
        this._autoReconnect = autoReconnect;
        this._requestManager = new RequestManager();
        this._sender = new PayloadSender();
        this._receiver = new PayloadReceiver();
        this._protocolAdapter = new ProtocolAdapter(
            this._requestHandler,
            this._requestManager,
            this._sender,
            this._receiver
        );
        this._sender.disconnected = this.onConnectionDisconnected.bind(this);
        this._receiver.disconnected = this.onConnectionDisconnected.bind(this);
    }

    /**
     * Returns true if currently connected.
     */
    public get isConnected(): boolean {
        return !!(this._receiver.isConnected && this._sender.isConnected);
    }

    /**
     * Used to establish the connection used by this server and begin listening for incoming messages.
     *
     * @returns A promised string that will not resolve as long as the server is running.
     */
    public async start(): Promise<string> {
        if (this._receiver.isConnected || this._sender.isConnected || this._incomingServer || this._outgoingServer) {
            this.disconnect();
        }

        const { PipePath, ServerIncomingPath, ServerOutgoingPath } = NamedPipeTransport;
        const incomingPipeName = PipePath + this._baseName + ServerIncomingPath;
        const outgoingPipeName = PipePath + this._baseName + ServerOutgoingPath;

        const incoming = new Promise<void>((resolve, reject) => {
            this._incomingServer = createNodeServer((socket: INodeSocket): void => {
                this._receiver.connect(new NamedPipeTransport(socket)).then(resolve, reject);
            });

            this._incomingServer.once('error', reject);
            this._incomingServer.listen(incomingPipeName);
        });

        const outgoing = new Promise<void>((resolve, reject) => {
            this._outgoingServer = createNodeServer((socket: INodeSocket): void => {
                this._sender.connect(new NamedPipeTransport(socket));
                resolve();
            });

            this._outgoingServer.once('error', reject);
            this._outgoingServer.listen(outgoingPipeName);
        });

        // These promises will only resolve when the underlying connection has terminated.
        // Anything awaiting on them will be blocked for the duration of the session,
        // which is useful when detecting premature terminations, but requires an unawaited
        // promise during the process of establishing the connection.
        try {
            await Promise.all([incoming, outgoing]);
        } catch (error) {
            // When iisnode spins up multiple node processes, they will attempt to connect to the same Named Pipe.
            // The Named Pipe is already in use by the first running node process, which will throw a EADDRINUSE error.
            // If this.warnIfPipeUnavailable is true, write to the console instead of rethrowing the error.
            // The BotFrameworkAdapter configures its NamedPipeServer to warn instead of throw as the only official
            // Named Pipe usage is for Direct Line ASE which is available on Windows Web Apps (which use iisnode).
            if (error.code === 'EADDRINUSE') {
                if (this.warnIfPipeUnavailable) {
                    console.warn('NamedPipeServer is not connected:');
                    console.warn(error.message);
                }
            } else {
                throw error;
            }
        }

        return 'connected';
    }

    /**
     * Allows for manually disconnecting the server.
     */
    public disconnect(): void {
        this._sender.disconnect();
        this._receiver.disconnect();

        if (this._incomingServer) {
            this._incomingServer.close();
            this._incomingServer = null;
        }

        if (this._outgoingServer) {
            this._outgoingServer.close();
            this._outgoingServer = null;
        }
    }

    /**
     * Task used to send data over this client connection.
     *
     * @param request The [StreamingRequest](xref:botframework-streaming.StreamingRequest) to send.
     * @returns A promise for an instance of [IReceiveResponse](xref:botframework-streaming.IReceiveResponse) on completion of the send operation.
     */
    public async send(request: StreamingRequest): Promise<IReceiveResponse> {
        return this._protocolAdapter.sendRequest(request);
    }

    /**
     * @private
     */
    private onConnectionDisconnected(): void {
        if (!this._isDisconnecting) {
            this._isDisconnecting = true;
            try {
                if (this._sender.isConnected) {
                    this._sender.disconnect();
                }

                if (this._receiver.isConnected) {
                    this._receiver.disconnect();
                }

                if (this._autoReconnect) {
                    this.start().catch((err): void => {
                        throw new Error(`Unable to reconnect: ${err.message}`);
                    });
                }
            } finally {
                this._isDisconnecting = false;
            }
        }
    }
}
