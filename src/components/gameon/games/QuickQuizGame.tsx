/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameConfig, GameOutcome } from '../../../types/gameon';
import { pickWeightedOutcome } from '../../../lib/gameonService';
import { playCardMatch, playLossBuzzer } from '../../../lib/gameonAudio';
import { Sparkles, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface QuickQuizGameProps {
  game: GameConfig;
  onFinishTurn: (outcome: GameOutcome) => void;
  disabled: boolean;
}

const DEFAULT_QUESTIONS = [
  {
    id: 'q1',
    question: 'In authentic Dum cooking, what is traditionally used to seal the clay handi lid?',
    options: ['Aluminium Foil', 'Wheat Flour Dough (Atta)', 'Silicone Gasket', 'Wax Cord'],
    correctIndex: 1,
  },
  {
    id: 'q2',
    question: 'Which royal spice gives traditional biryani its deep golden aromatic fragrance?',
    options: ['Cumin', 'Turmeric', 'Pure Kashmiri Saffron', 'Mustard Seed'],
    correctIndex: 2,
  },
  {
    id: 'q3',
    question: 'How does clay pot cooking enhance bhatti meats and gravies?',
    options: ['Retains moisture & adds earthy minerals', 'Cooks 10x faster', 'Removes all oils', 'Freezes spices'],
    correctIndex: 0,
  },
];

export default function QuickQuizGame({ game, onFinishTurn, disabled }: QuickQuizGameProps) {
  const questions = game.quizQuestions && game.quizQuestions.length >= 3 ? game.quizQuestions.slice(0, 3) : DEFAULT_QUESTIONS;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(12);
  const [isAnswered, setIsAnswered] = useState(false);

  useEffect(() => {
    if (disabled || isAnswered) return;
    if (timeLeft <= 0) {
      handleOptionSelect(-1); // Timed out
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, disabled, isAnswered]);

  const handleOptionSelect = (optionIndex: number) => {
    if (isAnswered || disabled) return;
    setIsAnswered(true);
    setSelectedOption(optionIndex);

    const q = questions[currentIdx];
    const isCorrect = optionIndex === q.correctIndex;

    let nextScore = score;
    if (isCorrect) {
      playCardMatch();
      nextScore = score + 1;
      setScore(nextScore);
    } else {
      playLossBuzzer();
    }

    setTimeout(() => {
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx(currentIdx + 1);
        setSelectedOption(null);
        setIsAnswered(false);
        setTimeLeft(12);
      } else {
        // Finished all questions! Check passing score
        const winThreshold = Number(game.quizPassingScore) || Math.ceil(questions.length * 0.6);
        if (nextScore >= winThreshold) {
          const winOutcome = game.outcomes.find((o) => o.isWin) || pickWeightedOutcome(game.outcomes);
          onFinishTurn(winOutcome);
        } else {
          const lossOutcome = game.outcomes.find((o) => !o.isWin) || {
            id: 'loss',
            label: 'Quiz Not Passed! Better Luck Next Time',
            probabilityWeight: 100,
            isWin: false,
          };
          onFinishTurn(lossOutcome);
        }
      }
    }, 1200);
  };

  const currentQ = questions[currentIdx];

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-5 select-none w-full max-w-md">
      {/* STATUS BAR: PROGRESS & TIMER */}
      <div className="flex items-center justify-between w-full px-4 py-2.5 bg-stone-900/90 rounded-2xl border border-amber-500/20 text-xs font-bold">
        <span className="text-amber-400">
          Question {currentIdx + 1} of {questions.length}
        </span>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 font-mono">
          <Clock className="w-3.5 h-3.5" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* QUESTION CARD */}
      <div className="w-full p-5 rounded-3xl bg-gradient-to-b from-stone-800 to-stone-950 border-2 border-amber-500/40 shadow-xl space-y-4">
        <h4 className="text-sm sm:text-base font-extrabold text-white text-center leading-snug">
          {currentQ.question}
        </h4>

        {/* OPTIONS */}
        <div className="space-y-2.5 pt-2">
          {currentQ.options.map((opt, idx) => {
            const isChosen = selectedOption === idx;
            const isCorrect = idx === currentQ.correctIndex;

            let btnStyle = 'bg-stone-900/80 border-stone-700 text-stone-200 hover:border-amber-500/60';
            if (isAnswered) {
              if (isCorrect) {
                btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-md';
              } else if (isChosen) {
                btnStyle = 'bg-red-950/80 border-red-500 text-red-200 shadow-md';
              } else {
                btnStyle = 'bg-stone-900/40 border-stone-800 text-stone-500';
              }
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={isAnswered || disabled}
                onClick={() => handleOptionSelect(idx)}
                className={`w-full p-3.5 rounded-2xl border-2 font-bold text-xs text-left transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
              >
                <span>{opt}</span>
                {isAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                {isAnswered && isChosen && !isCorrect && <XCircle className="w-4 h-4 text-red-400 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
