import React from 'react';

/**
 * OSS Command Center Brand Logo
 * Geometric node-convergence emblem with subtle gradient accents.
 */
export const OSSBrandLogo: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="OSS Command Center Logo"
  >
    <defs>
      <linearGradient id="ossGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#749DD0" />
        <stop offset="1" stopColor="#4A7BB0" />
      </linearGradient>
    </defs>
    {/* Outer squircle contour */}
    <rect
      x="2"
      y="2"
      width="20"
      height="20"
      rx="5"
      stroke="url(#ossGrad)"
      strokeWidth="1.75"
      className="opacity-90"
    />
    {/* Converging branch network */}
    <path
      d="M7 6v12M7 12h3c2.2 0 4-1.8 4-4v0c0-1.1.9-2 2-2h1M10 12c2.2 0 4 1.8 4 4v0c0 1.1.9 2 2 2h1"
      stroke="#E8F1F5"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Nodes */}
    <circle cx="7" cy="6" r="1.5" fill="#749DD0" />
    <circle cx="7" cy="18" r="1.5" fill="#749DD0" />
    <circle cx="17" cy="6" r="1.5" fill="#8BB5E8" />
    <circle cx="17" cy="18" r="1.5" fill="#8BB5E8" />
  </svg>
);

/**
 * Official GitHub Mark (Simple Icons standard)
 */
export const GitHubLogo: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="GitHub"
  >
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

/**
 * Official Multi-tone GitLab Logo
 */
export const GitLabLogo: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="GitLab"
  >
    {/* Center lower facet */}
    <path fill="#E24329" d="m12 23.018 3.96-11.884H8.04L12 23.018z" />
    {/* Left facet */}
    <path fill="#FC6D26" d="M12 23.018 8.04 11.134.434 9.506a.858.858 0 0 0-.29.441 6.066 6.066 0 0 0 2.04 7.173L12 23.018z" />
    {/* Right facet */}
    <path fill="#FC6D26" d="m12 23.018 3.96-11.884 7.606-1.628a.9.9 0 0 1 .29.441 6.075 6.075 0 0 1-2.023 7.023L12 23.018z" />
    {/* Left ear */}
    <path fill="#FCA326" d="M.434 9.506 2.639 2.766a.855.855 0 0 1 .845-.534.9.9 0 0 1 .492.183.9.9 0 0 1 .29.441l2.205 6.748L.434 9.506z" />
    {/* Right ear */}
    <path fill="#FCA326" d="m23.566 9.506-2.205-6.74a.855.855 0 0 0-.845-.534.9.9 0 0 0-.492.183.9.9 0 0 0-.29.441l-2.205 6.748 6.037-.098z" />
  </svg>
);
