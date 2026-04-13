import React from 'react';

export const AgileIcon = ({ size = 24, className = '' }) => {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      className={className}
      width={size}
      height={size}
    >
      {/* Outer circle border */}
      <circle cx="100" cy="100" r="95" stroke="currentColor" strokeWidth="2" />

      {/* Three iterative spiral segments representing agile sprints */}
      <g id="sprint-1">
        <path
          d="M 100 30 Q 140 30 140 70"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <polygon points="140,70 150,65 145,80" fill="currentColor" />
      </g>

      <g id="sprint-2">
        <path
          d="M 140 70 Q 150 100 110 145"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <polygon points="110,145 105,132 120,138" fill="currentColor" />
      </g>

      <g id="sprint-3">
        <path
          d="M 110 145 Q 60 140 55 95"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <polygon points="55,95 50,105 65,100" fill="currentColor" />
      </g>

      {/* Center checkmark representing success/completion */}
      <g id="checkmark">
        <circle cx="100" cy="100" r="25" fill="currentColor" opacity="0.1" />
        <path
          d="M 88 105 Q 95 112 112 95"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      {/* Upward arrow for growth/success */}
      <g id="growth-arrow" transform="translate(100, 100)">
        <line
          x1="0"
          y1="15"
          x2="0"
          y2="-15"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <polygon points="0,-15 -4,-5 4,-5" fill="currentColor" />
      </g>
    </svg>
  );
};

export default AgileIcon;
