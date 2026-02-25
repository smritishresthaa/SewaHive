import React, { useState, useEffect } from "react";
import { HiPlay, HiPause, HiStop } from "react-icons/hi2";
import toast from "react-hot-toast";

export default function JobTimer({ booking, onTimerChange }) {
  const [displayTime, setDisplayTime] = useState("00:00:00");
  const [isRunning, setIsRunning] = useState(booking?.timeTracking?.isTimerRunning || false);
  const [totalSeconds, setTotalSeconds] = useState(booking?.timeTracking?.totalSeconds || 0);

  // Sync from booking prop so pause/resume keeps latest time from backend
  useEffect(() => {
    const ts = booking?.timeTracking?.totalSeconds ?? 0;
    const running = booking?.timeTracking?.isTimerRunning ?? false;
    setTotalSeconds(ts);
    setIsRunning(running);
    setDisplayTime(formatTime(ts));
  }, [booking?.timeTracking?.totalSeconds, booking?.timeTracking?.isTimerRunning, booking?.timeTracking?.timerStartedAt]);

  // Format time as HH:MM:SS
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Update display time whenever totalMinutes changes
  useEffect(() => {
    setDisplayTime(formatTime(totalSeconds));
  }, [totalSeconds]);

  // Timer interval effect
  useEffect(() => {
    if (!isRunning) return;

    const secondInterval = setInterval(() => {
      setTotalSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(secondInterval);
    };
  }, [isRunning]);

  const handleStartTimer = async () => {
    setIsRunning(true);
    if (onTimerChange) {
      await onTimerChange("start", booking._id);
    }
    toast.success("Timer started! ⏱️");
  };

  const handlePauseTimer = async () => {
    setIsRunning(false);
    if (onTimerChange) {
      await onTimerChange("pause", booking._id, totalSeconds);
    }
    toast.success("Timer paused ⏸️");
  };

  const handleResetTimer = async () => {
    if (!confirm("Reset timer to 0:00:00?")) return;
    setIsRunning(false);
    setTotalSeconds(0);
    setDisplayTime("00:00:00");
    if (onTimerChange) {
      await onTimerChange("reset", booking._id);
    }
    toast.success("Timer reset ⏹️");
  };

  const includedHours = Number(booking?.pricing?.includedHours || booking?.serviceId?.includedHours || 0);
  const hourlyRate = Number(booking?.pricing?.hourlyRate || booking?.serviceId?.hourlyRate || 0);
  const priceMode = booking?.pricing?.mode || booking?.serviceId?.priceMode || "fixed";
  const workedHours = totalSeconds / 3600;
  const canEstimateExtra = hourlyRate > 0 && includedHours > 0;
  const extraHours = canEstimateExtra ? Math.max(0, workedHours - includedHours) : 0;
  const estimatedExtraCost = canEstimateExtra ? (extraHours * hourlyRate).toFixed(2) : "0.00";
  const basePrice = Number(booking?.pricing?.basePrice || booking?.pricing?.basePriceAtBooking || booking?.price || 0);
  const isRangeMinimum = priceMode === "range" && includedHours <= 0;
  const timeAllowanceLabel = canEstimateExtra
    ? `Included: ${includedHours.toFixed(2)} hrs${hourlyRate > 0 ? ` • Extra @ NPR ${hourlyRate}/hour` : ""}`
    : isRangeMinimum
    ? hourlyRate > 0
      ? `Minimum service fee. Extra @ NPR ${hourlyRate}/hour when approved.`
      : "Minimum service fee. Extra charges require approval."
    : "Timer is for record only.";
  const baseNote = isRangeMinimum
    ? `Minimum service fee is NPR ${basePrice.toLocaleString()}. Extra charges require client approval.`
    : priceMode === "fixed" && !canEstimateExtra
    ? `Base service amount is fixed at NPR ${basePrice.toLocaleString()}.`
    : `Base service amount remains NPR ${basePrice.toLocaleString()} unless an additional charge request is approved.`;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6 mb-4">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        ⏱️ Work Duration Tracker
      </h3>

      <div className="bg-white rounded-lg p-6 mb-4 border-2 border-purple-300 text-center">
        <div className="text-5xl font-mono font-bold text-purple-700 mb-2">
          {displayTime}
        </div>
        <p className="text-sm text-gray-600">Hours : Minutes : Seconds</p>
      </div>

      {/* Estimate-only extra cost */}
      <div className="bg-blue-50 rounded-lg p-4 mb-4 border-l-4 border-blue-500">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-600 uppercase font-medium">Estimated Extra Cost</p>
            <p className="text-2xl font-bold text-blue-700">NPR {estimatedExtraCost}</p>
            <p className="text-xs text-gray-600 mt-1">
              {timeAllowanceLabel}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600">Time Logged</p>
            <p className="text-xl font-bold text-gray-900">
              {workedHours.toFixed(2)} hrs
            </p>
          </div>
        </div>
        <p className="text-xs text-blue-800 mt-2">
          Work duration tracker — final charges require client approval.
        </p>
        <p className="text-xs text-blue-700 mt-1">
          {baseNote}
        </p>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3">
        {!isRunning ? (
          <button
            onClick={handleStartTimer}
            className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            <HiPlay className="text-lg" />
            Start Timer
          </button>
        ) : (
          <button
            onClick={handlePauseTimer}
            className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            <HiPause className="text-lg" />
            Pause Timer
          </button>
        )}

        <button
          onClick={handleResetTimer}
          className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          <HiStop className="text-lg" />
          Reset
        </button>
      </div>

      {/* Session History */}
      {booking?.timeTracking?.timerSessions && booking.timeTracking.timerSessions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-purple-200">
          <p className="text-sm font-semibold text-gray-700 mb-2">Work Sessions:</p>
          <div className="space-y-1 text-xs text-gray-600">
            {booking.timeTracking.timerSessions.map((session, idx) => (
              <div key={idx} className="flex justify-between bg-white rounded px-2 py-1">
                <span>Session {idx + 1}:</span>
                <span>{Math.round(session.durationSeconds / 60)} min</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
