import { useState, type FormEvent } from 'react';
import {
  metersToDimensionInput,
  parseDimension,
  parseRoomDimensions,
  type DimensionInput,
  type RoomDimensionsResult,
} from './room-dimensions';
import { RoomPlanSurface } from './room-plan-surface';

type FieldErrors = Extract<RoomDimensionsResult, { ok: false }>['errors'];

const metricWidth: DimensionInput = { unit: 'meters', meters: '5' };
const metricLength: DimensionInput = { unit: 'meters', meters: '4' };

function blankInput(unit: DimensionInput['unit']): DimensionInput {
  return unit === 'meters'
    ? { unit, meters: '' }
    : { unit, feet: '', inches: '' };
}

function convertInput(
  input: DimensionInput,
  unit: DimensionInput['unit'],
): DimensionInput {
  const parsed = parseDimension(input);
  return parsed.ok
    ? metersToDimensionInput(parsed.meters, unit)
    : blankInput(unit);
}

export function RoomDimensionForm() {
  const [width, setWidth] = useState<DimensionInput>(metricWidth);
  const [length, setLength] = useState<DimensionInput>(metricLength);
  const [preview, setPreview] = useState({ widthMeters: 5, lengthMeters: 4 });
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const unit = width.unit;

  function selectUnit(nextUnit: DimensionInput['unit']) {
    if (nextUnit === unit) return;
    setWidth((current) => convertInput(current, nextUnit));
    setLength((current) => convertInput(current, nextUnit));
  }

  function updateField(field: 'width' | 'length', next: DimensionInput) {
    (field === 'width' ? setWidth : setLength)(next);
    setErrors((current) => ({ ...current, [field]: undefined }));
    setPending(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = parseRoomDimensions(width, length);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setPreview(result);
    setConfirmed(true);
    setPending(false);
  }

  const boundary = [
    { x: 0, y: 0 },
    { x: preview.widthMeters, y: 0 },
    { x: preview.widthMeters, y: preview.lengthMeters },
    { x: 0, y: preview.lengthMeters },
  ];

  return (
    <section className="room-builder" id="room-builder">
      <div className="room-builder-heading">
        <p className="eyebrow">Start with what you know</p>
        <h2>Enter your room dimensions.</h2>
        <p>Use measurements from the room. Values are stored in meters.</p>
      </div>
      <div className="room-builder-layout">
        <form className="dimension-form" onSubmit={submit} noValidate>
          <fieldset className="unit-choice">
            <legend>Input units</legend>
            {(['meters', 'feet_inches'] as const).map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="dimension-unit"
                  value={value}
                  checked={unit === value}
                  onChange={() => selectUnit(value)}
                />
                {value === 'meters' ? 'Meters' : 'Feet & inches'}
              </label>
            ))}
          </fieldset>

          {unit === 'meters' ? (
            <div className="dimension-fields">
              {(['width', 'length'] as const).map((field) => {
                const input = field === 'width' ? width : length;
                const value = input.unit === 'meters' ? input.meters : '';
                return (
                  <label key={field}>
                    <span>
                      {field === 'width' ? 'Width' : 'Length'} in meters
                    </span>
                    <input
                      value={value}
                      inputMode="decimal"
                      aria-invalid={Boolean(errors[field])}
                      aria-describedby={
                        errors[field] ? `${field}-error` : undefined
                      }
                      onChange={(event) =>
                        updateField(field, {
                          unit: 'meters',
                          meters: event.target.value,
                        })
                      }
                    />
                    {errors[field] && (
                      <small id={`${field}-error`}>{errors[field]}</small>
                    )}
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="dimension-fields imperial-fields">
              {(['width', 'length'] as const).map((field) => {
                const input = field === 'width' ? width : length;
                const values =
                  input.unit === 'feet_inches'
                    ? input
                    : { unit: 'feet_inches' as const, feet: '', inches: '' };
                return (
                  <fieldset key={field}>
                    <legend>{field === 'width' ? 'Width' : 'Length'}</legend>
                    <label>
                      Feet
                      <input
                        value={values.feet}
                        inputMode="numeric"
                        aria-invalid={Boolean(errors[field])}
                        aria-describedby={
                          errors[field] ? `${field}-imperial-error` : undefined
                        }
                        onChange={(event) =>
                          updateField(field, {
                            ...values,
                            feet: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Inches
                      <input
                        value={values.inches}
                        inputMode="decimal"
                        aria-invalid={Boolean(errors[field])}
                        aria-describedby={
                          errors[field] ? `${field}-imperial-error` : undefined
                        }
                        onChange={(event) =>
                          updateField(field, {
                            ...values,
                            inches: event.target.value,
                          })
                        }
                      />
                    </label>
                    {errors[field] && (
                      <small id={`${field}-imperial-error`}>
                        {errors[field]}
                      </small>
                    )}
                  </fieldset>
                );
              })}
            </div>
          )}

          <button className="primary-action" type="submit">
            {confirmed ? 'Update room preview' : 'Confirm these dimensions'}
          </button>
          <p className="dimension-status" aria-live="polite">
            {!confirmed
              ? 'The preview is an illustrative sample until you confirm.'
              : pending
                ? 'The preview shows your last confirmed measurements.'
                : 'The preview uses your confirmed measurements.'}
          </p>
        </form>

        <div className="room-builder-preview">
          <RoomPlanSurface
            boundary={boundary}
            provenance={confirmed ? 'validated' : 'sample'}
            label={
              confirmed
                ? 'Room plan from confirmed dimensions'
                : 'Illustrative rectangular sample room'
            }
          />
        </div>
      </div>
    </section>
  );
}
