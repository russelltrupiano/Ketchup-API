exports.sameDay = function(date1, date2) {
    // Time difference in days
    var timeDiff = (date1.getTime() - date2.getTime())/86400000;
    return timeDiff >= 0.0 && timeDiff <= 2.0;
}

exports.minutesBetween = function(date1, date2) {
    var timeDiff = (date1.getTime() - date2.getTime())/60000;
    return timeDiff;
}