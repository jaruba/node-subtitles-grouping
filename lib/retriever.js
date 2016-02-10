var stream = require("stream");
var needle = require("needle");
var fs = require("fs");
var iconv = require("iconv-lite");
var unzip = require("unzip");
var charsetDetector = require("jschardet");
var zlib = require("zlib");
var _ = require("lodash");

function streamFromPath(path, agent)
{
	if (path instanceof stream.Readable) return path;
	if (path.match("^http")) return needle.get(path, { agent: agent });
	return fs.createReadStream(path);
};

function retrieveSrt(path, cb, options)
{
    var callback = _.once(function(err, res, subnm) {
        if (err && options && options.agent) return retrieveSrt(path, cb); // Re-try without agent
        cb(err, res, subnm);
    });

	var stream = streamFromPath(path, options && options.agent);
    stream.on("error", function(err) { callback(err) });
    if (path.match("zip$")) {
        var foundSrt = false, bufs = [];
        stream.pipe(unzip.Parse())
        .on("entry", function(entry) {
            // TODO: think about the case when we find multiple srt's; currently this is an unseen case
            if ((!entry.path.match("srt$") && !entry.path.match("sub$") && !entry.path.match("vtt$")) || foundSrt) return;
            foundSrt = true;
            entry.on("data", function(dat) { bufs.push(dat) });
            entry.on("end", function() {
				onDownloaded(entry.path);
			});
            entry.on("error", function(e) { callback(e) });
        })
        .on("error", function(e) { callback(e) })
        .on("close", function() {
            if (! foundSrt) { callback(new Error("no subtitle found in archive "+path)); }
        });
    } else {
        if (path.match("gz$")) var stream = stream.pipe(zlib.createUnzip());
        var bufs = [];
        stream.on("data", function(dat) { bufs.push(dat) })
        stream.on("end", onDownloaded);
        stream.on("error", function(e) { callback(e) });
    }

    function onDownloaded(subnm) {
        //if (! bufs.length) HANDLE ERROR

        var buf = Buffer.concat(bufs);

        if (options.charset && options.charset != "auto") var charset = options.charset;
        else var charset = charsetDetector.detect(buf).encoding;

        try { buf = iconv.decode(buf, charset) } catch(e) { callback(e); return };

        callback(null, buf, subnm);
    };    
};

module.exports = {
	streamFromPath: streamFromPath,
	retrieveSrt: retrieveSrt,
};
