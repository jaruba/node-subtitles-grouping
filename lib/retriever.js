var stream = require("stream");
var request = require("request");
var fs = require("fs");
var iconv = require("iconv-lite");
var unzip = require("unzip");
var charsetDetector = require("jschardet");
var zlib = require("zlib");

function streamFromPath(path)
{
	if (path instanceof stream.Readable) return path;
	if (path.match("^http")) return request(path);
	return fs.createReadStream(path);
};

function retrieveSrt(path, callback)
{
	var stream = streamFromPath(path);
    if (path.match("zip$")) {
        var foundSrt = false, bufs = [];
        stream.pipe(unzip.Parse())
        .on("entry", function(entry) {
            // TODO: think about the case when we find multiple srt's; currently this is an unseen case
            if (!entry.path.match("srt$") || foundSrt) return;
            foundSrt = true;
            entry.on("data", function(dat) { bufs.push(dat) });
            entry.on("end", onDownloaded);
        }).on("close", function() {
            if (! foundSrt) { callback(new Error("no srt found in zip file "+path)); }
        });
    } else {
        if (path.match("gz$")) var stream = stream.pipe(zlib.createUnzip());
        var bufs = [];
        stream.on("data", function(dat) { bufs.push(dat) })
        stream.on("end", onDownloaded);
        stream.on("error", function(e) { callback(e) });                
    }

    function onDownloaded() {
        //if (! bufs.length) HANDLE ERROR

        var buf = Buffer.concat(bufs);

        var charset = charsetDetector.detect(buf).encoding;
        try { buf = iconv.decode(buf, charset) } catch(e) { callback(e); return };

        callback(null, buf);           
    };    
};

module.exports = {
	streamFromPath: streamFromPath,
	retrieveSrt: retrieveSrt,
};