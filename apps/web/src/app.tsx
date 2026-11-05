import { productSteps } from './product-steps';
import './styles.css';

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
            Capture a room with your phone, explore a measured 3D model, and
            compare furnishing plans built from products you can actually buy.
          </p>
          <a className="primary-action" href="#workflow">
            Preview the workflow
          </a>
        </div>
        <div className="room-card" aria-label="Illustrated room preview">
          <div className="sun" />
          <div className="window" />
          <div className="sofa">
            <span />
            <span />
            <span />
          </div>
          <div className="table" />
          <p>Interactive room preview coming soon</p>
        </div>
      </section>

      <section className="workflow" id="workflow">
        <p className="eyebrow">The pilot workflow</p>
        <h2>From phone video to a practical plan.</h2>
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
