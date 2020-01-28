---
id: "_core_http_nodejsfiledownloader_"
title: "core/http/nodeJsFileDownloader"
sidebar_label: "core/http/nodeJsFileDownloader"
---

[cds-for-code](../index.md) › [Globals](../globals.md) › ["core/http/nodeJsFileDownloader"](_core_http_nodejsfiledownloader_.md)

## Index

### Variables

* [mimeTypes](_core_http_nodejsfiledownloader_.md#const-mimetypes)

### Functions

* [download](_core_http_nodejsfiledownloader_.md#download)

## Variables

### `Const` mimeTypes

• **mimeTypes**: *[Dictionary](../classes/_core_types_dictionary_.dictionary.md)‹string, string›* = new Dictionary<string, string>([
    { key: ".zip", value: "application/x-zip-compressed" },
    { key: ".ps1", value: "text/plain" },
    { key: ".css", value: "text/css" },
    { key: ".js", value: "application/javascript" },
    { key: ".json", value: "application/json" },
    { key: ".svg", value: "image/svg+xml" },
    { key: ".gif", value: "image/gif" },
    { key: ".jpg", value: "image/jpeg" }
])

Defined in src/core/http/nodeJsFileDownloader.ts:8

## Functions

###  download

▸ **download**(`remoteFilePath`: string, `localFilePath`: string): *Promise‹string›*

Defined in src/core/http/nodeJsFileDownloader.ts:19

**Parameters:**

Name | Type |
------ | ------ |
`remoteFilePath` | string |
`localFilePath` | string |

**Returns:** *Promise‹string›*