import { CapturePanel } from './capture-panel';
import { productSteps } from './product-steps';
import { RoomDimensionForm } from './room-dimension-form';
import { RoomPlanSurface } from './room-plan-surface';
import './styles.css';

const previewBoundary = [
  { x: 0, y: 0 },
  { x: 5, y: 0 },
  { x: 5, y: 4 },
  { x: 0, y: 4 },
];

export function App() {
  return (
    <main>
      <nav aria-label="Primary navigation">
        <a className="brand" href="/" aria-label="Room Planner home">
          <span aria-hidden="true">RP</span>
          Room Planner
        </a>
        <a className="quiet-link" href="#workflow">
          How it works
        </a>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">A room, reconsidered</p>
          <h1>See the space before you furnish it.</h1>
          <p className="lede">
            Start with room dimensions you already know, or choose a phone video
            for the reconstruction workflow. Then compare furnishing plans built
            from products you can actually buy.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#room-builder">
              Enter room dimensions
            </a>
            <a className="quiet-link" href="#capture">
              Or choose a room video
            </a>
          </div>
        </div>
        <div className="room-card">
          <RoomPlanSurface
            boundary={previewBoundary}
            provenance="sample"
            label="Illustrative five by four meter sample room"
          />
        </div>
      </section>

      <RoomDimensionForm />

      <CapturePanel />

      <section className="workflow" id="workflow">
        <p className="eyebrow">The pilot workflow</p>
        <h2>From room input to a practical plan.</h2>
        <ol>
          {productSteps.map((step, index) => (
            <li key={step.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
