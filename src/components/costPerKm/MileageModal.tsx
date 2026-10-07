import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Vehicle, VehicleMonthlyMileage } from '../../types';
import { storage } from '../../services/storage';

interface MileageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: VehicleMonthlyMileage) => void;
  vehicles: Vehicle[];
  initialData?: VehicleMonthlyMileage | null;
  defaultYear?: number;
  defaultMonth?: number;
}

export const MileageModal: React.FC<MileageModalProps> = ({
  isOpen,
  onClose,
  onSave,
  vehicles,
  initialData,
  defaultYear = new Date().getFullYear(),
  defaultMonth = new Date().getMonth() + 1,
}) => {
  const [month, setMonth] = useState<number>(defaultMonth);
  const [year, setYear] = useState<number>(defaultYear);
  const [vehicleNo, setVehicleNo] = useState<string>(vehicles[0]?.vehicleNo || '');
  const [startOdometer, setStartOdometer] = useState<number | ''>('');
  const [endOdometer, setEndOdometer] = useState<number | ''>('');
  const [totalKmRun, setTotalKmRun] = useState<number>(0);
  const [totalTrips, setTotalTrips] = useState<number | ''>('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Auto-find previous month's end odometer reading if available
  const findPreviousOdometer = (targetVehicleNo: string, targetYear: number, targetMonth: number) => {
    const allMileages = storage.getMileages();
    let prevMonth = targetMonth - 1;
    let prevYear = targetYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = targetYear - 1;
    }
    const prevRecord = allMileages.find(
      (m) =>
        m.vehicleNo.trim().toUpperCase() === targetVehicleNo.trim().toUpperCase() &&
        m.year === prevYear &&
        m.month === prevMonth
    );
    if (prevRecord && prevRecord.endOdometer) {
      return prevRecord.endOdometer;
    }
    // Or check if there is any fuel odometer reading
    const allFuel = storage.getFuel().filter(
      (f) => f.vehicleNo.trim().toUpperCase() === targetVehicleNo.trim().toUpperCase() && f.odometerReading
    );
    if (allFuel.length > 0) {
      return allFuel[0].odometerReading;
    }
    return undefined;
  };

  useEffect(() => {
    if (initialData) {
      setMonth(initialData.month);
      setYear(initialData.year);
      setVehicleNo(initialData.vehicleNo);
      setStartOdometer(initialData.startOdometer ?? '');
      setEndOdometer(initialData.endOdometer ?? '');
      setTotalKmRun(initialData.totalKmRun || 0);
      setTotalTrips(initialData.totalTrips ?? '');
      setRemarks(initialData.remarks || '');
    } else {
      const initVeh = vehicles[0]?.vehicleNo || '';
      setMonth(defaultMonth);
      setYear(defaultYear);
      setVehicleNo(initVeh);
      const prevOdo = findPreviousOdometer(initVeh, defaultYear, defaultMonth);
      if (prevOdo) {
        setStartOdometer(prevOdo);
        setEndOdometer(prevOdo + 2500);
        setTotalKmRun(2500);
      } else {
        setStartOdometer(45000);
        setEndOdometer(47500);
        setTotalKmRun(2500);
      }
      setTotalTrips('');
      setRemarks('');
    }
    setError(null);
  }, [initialData, isOpen, vehicles, defaultYear, defaultMonth]);

  // Recalculate start odometer when vehicle or month changes in create mode
  const handleVehicleChange = (vNo: string) => {
    setVehicleNo(vNo);
    if (!initialData) {
      const prevOdo = findPreviousOdometer(vNo, year, month);
      if (prevOdo) {
        setStartOdometer(prevOdo);
        if (endOdometer !== '' && Number(endOdometer) > prevOdo) {
          setTotalKmRun(Number(endOdometer) - prevOdo);
        } else {
          setEndOdometer(prevOdo + 2000);
          setTotalKmRun(2000);
        }
      }
    }
  };

  const handleStartOdometerChange = (val: number | '') => {
    setStartOdometer(val);
    if (val !== '' && endOdometer !== '') {
      const diff = Number(endOdometer) - Number(val);
      setTotalKmRun(diff > 0 ? diff : 0);
    }
  };

  const handleEndOdometerChange = (val: number | '') => {
    setEndOdometer(val);
    if (val !== '' && startOdometer !== '') {
      const diff = Number(val) - Number(startOdometer);
      setTotalKmRun(diff > 0 ? diff : 0);
    }
  };

  const handleTotalKmChange = (val: number) => {
    setTotalKmRun(val);
    if (startOdometer !== '') {
      setEndOdometer(Number(startOdometer) + Number(val));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNo) {
      setError('Please select a vehicle.');
      return;
    }
    if (totalKmRun <= 0) {
      setError('Total KM run must be greater than 0. Check your current and previous odometer readings.');
      return;
    }

    const payload: VehicleMonthlyMileage = {
      id: initialData?.id || `km-${Date.now()}`,
      vehicleNo: vehicleNo.trim(),
      month: Number(month),
      year: Number(year),
      startOdometer: startOdometer !== '' ? Number(startOdometer) : undefined,
      endOdometer: endOdometer !== '' ? Number(endOdometer) : undefined,
      totalKmRun: Number(totalKmRun),
      totalTrips: totalTrips !== '' ? Number(totalTrips) : undefined,
      remarks: remarks.trim() || undefined,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(payload);
    onClose();
  };

  const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Vehicle KM Reading' : 'Log Vehicle KM Reading'}
      subtitle="Enter last month and this month odometer readings. Total KM will be calculated automatically."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium">
            {error}
          </div>
        )}

        {/* Period Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Month *</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              required
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Year *</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              required
            >
              {[2022, 2023, 2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Vehicle Selection */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Vehicle *</label>
          <select
            value={vehicleNo}
            onChange={(e) => handleVehicleChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono font-bold text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
            required
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.vehicleNo}>
                {v.vehicleNo} — {v.vehicleModel} ({v.driverName})
              </option>
            ))}
          </select>
        </div>

        {/* Odometer Readings: Last Month KM & This Month KM */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Last Month KM (Start Reading) *
              </label>
              <input
                type="number"
                min="0"
                value={startOdometer}
                onChange={(e) =>
                  handleStartOdometerChange(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="e.g. 45000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                required
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Previous month ending reading
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                This Month KM (End Reading) *
              </label>
              <input
                type="number"
                min="0"
                value={endOdometer}
                onChange={(e) =>
                  handleEndOdometerChange(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="e.g. 47500"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                required
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Current month ending reading
              </span>
            </div>
          </div>

          {/* Auto-Calculated Total KM Box */}
          <div className="p-3 bg-sky-50/90 border border-sky-200 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-sky-900 uppercase block">
                Total Distance Driven (Auto-Calculated)
              </span>
              <span className="text-xl font-black text-sky-950 font-mono">
                {totalKmRun.toLocaleString()} KM
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-sky-700 font-mono block">
                {endOdometer || 0} - {startOdometer || 0}
              </span>
              <span className="text-[10px] text-slate-500">
                Formula: Current KM - Previous KM
              </span>
            </div>
          </div>
        </div>

        {/* Trips & Remarks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Total Trips Count (Optional)</label>
            <input
              type="number"
              min="0"
              value={totalTrips}
              onChange={(e) => setTotalTrips(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 24"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Remarks (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Regular monthly route"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-white bg-sky-600 hover:bg-sky-700 rounded-lg font-bold shadow-sm transition-colors"
          >
            {initialData ? 'Update Reading' : 'Save Reading'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
