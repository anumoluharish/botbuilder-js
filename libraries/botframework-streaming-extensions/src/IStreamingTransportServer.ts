/**
 * @module botframework-streaming-extensions
 */
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { CancellationToken } from './CancellationToken';
import { ReceiveResponse } from './ReceiveResponse';
import { StreamingRequest } from './StreamingRequest';

/// <summary>
/// Interface implemented by StreamingTransportServer classes for each transport type.
/// </summary>
export interface IStreamingTransportServer {
  startAsync(): Promise<string>;
  disconnect(): void;
  sendAsync(request: StreamingRequest, cancellationToken: CancellationToken): Promise<ReceiveResponse>;
}
