var _ = require("lodash");

/*
 * ALGO PARAMS
 */
var SCORE_THRESHOLD = 0.85;
var OVERLAP_FRACTION = 0.4; // this replaces the upper one (score threshold); this is usually 0.5, but we'd rather be under-sensitive than over-sensitive in some cases


function groupSubtitles(subs, sensitivity) 
{
  var groups = [];

  var avg = subs
    .map(function(x) { return (x.heatmap.reduce(function(a,b) { return a+b },0) / x.heatmap.length) || 0 })
    .reduce(function(a,b) { return a+b }, 0) / subs.length;

  var h = avg > 0.5 ? avg : 1-avg,
      l = avg > 0.5 ? 1-avg : avg,
      threshold =  groups.threshold = h + ( sensitivity || OVERLAP_FRACTION )*l;

  subs.forEach(function(sub) {
    var maxScore = 0, bestGroup;
    groups.forEach(function(group) {
      var avg = average(_.pluck(group, "heatmap"));
      var s = compare(avg, sub.heatmap);
      if (s > maxScore) {
        bestGroup = group;
        maxScore = s;
      }
    });
    if (!bestGroup || maxScore < threshold)
      groups.push([ sub ]);
    else bestGroup.push(sub);
  });
  groups.sort(function(a,b) { return b.length - a.length });
  return groups;
};

function compare(a, b)
{
  var score = 0;
  for (var i=0; i!=a.length; i++) 
    score += a[i] == b[i];
    //score += Math.min(a[i], b[i] || 0);
  return score / Math.max(a.length, b.length);
};

function average(group)
{
  var avg = [];
  group.forEach(function(hmap) {
    for (var i=0; i!=hmap.length; i++) {
      if (! avg[i]) avg[i] = 0;
      avg[i] += hmap[i];
    }

  }); 
  for (var i=0; i!=avg.length; i++)
      avg[i] = Math.round(avg[i]/group.length);
  return avg;
};

module.exports = { 
  group: groupSubtitles,
  compare: compare,
  average: average
};