type CompactSliderProps = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  valueLabel?: string;
  onChange: (value: number) => void;
};

const CompactSlider = ({
  id,
  label,
  value,
  min,
  max,
  step,
  valueLabel,
  onChange,
}: CompactSliderProps) => {
  return (
    <div className="slider-row">
      <label className="slider-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="slider-input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="slider-value">{valueLabel ?? value}</span>
    </div>
  );
};

export default CompactSlider;
