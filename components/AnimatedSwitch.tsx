import React from 'react';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const AnimatedSwitch: React.FC<Props> = ({ checked, onChange, disabled = false }) => {
  return (
    <label className="inline-flex items-center cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="hidden"
      />
      <span className={`relative inline-flex h-7 w-12 rounded-full transition-all duration-300 ${
        checked ? 'bg-blue-600 shadow-lg shadow-blue-600/50' : 'bg-zinc-700 shadow-lg shadow-zinc-700/30'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'group-hover:shadow-lg'}`}>
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-300 absolute top-0.5 ${
            checked ? 'translate-x-6' : 'translate-x-0.5'
          }`}
        />
      </span>
    </label>
  );
};

export default AnimatedSwitch;
