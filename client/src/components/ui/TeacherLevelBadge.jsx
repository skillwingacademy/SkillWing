import React from 'react';

const TeacherLevelBadge = ({ level = 'Junior', className = '' }) => {
  const levelStyles = {
    Junior: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Senior: 'bg-blue-50 text-blue-700 border-blue-200',
    Master: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const style = levelStyles[level] || levelStyles.Junior;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${style} ${className}`}>
      {level}
    </span>
  );
};

export default TeacherLevelBadge;
