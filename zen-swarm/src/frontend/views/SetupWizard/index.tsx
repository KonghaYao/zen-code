/**
 * SetupWizard - 新用户初始化向导
 *
 * 4 步引导流程：
 * 1. 欢迎页
 * 2. Provider 配置
 * 3. 模型选择
 * 4. 完成
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { DesktopWallpaper } from '../../components/desktop/index.js';
import { StepWelcome } from './StepWelcome.js';
import { StepProvider } from './StepProvider.js';
import { StepModels } from './StepModels.js';
import { StepComplete } from './StepComplete.js';
import { providerKeys } from '../../hooks/useProviders.js';
import type { ProviderType } from '../../hooks/useProviders.js';

type Step = 1 | 2 | 3 | 4;

interface WizardData {
    providerId: string;
    providerType: ProviderType;
}

const STEP_LABELS = ['欢迎', 'Provider', '模型', '完成'];

export function SetupWizard() {
    const [step, setStep] = useState<Step>(1);
    const [wizardData, setWizardData] = useState<WizardData>({
        providerId: '',
        providerType: 'openai',
    });
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const handleProviderCreated = (providerId: string, providerType: ProviderType) => {
        setWizardData({ providerId, providerType });
        setStep(3);
    };

    const handleModelsCreated = () => {
        setStep(4);
    };

    const handleFinish = async () => {
        // 先等待缓存刷新完成，再导航到 /chat
        // 避免 DockLayout 拿到旧的空数组后再次重定向到 /setup
        await queryClient.refetchQueries({ queryKey: providerKeys.list() });
        navigate('/chat');
    };

    const handleSkip = () => {
        navigate('/');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* 背景壁纸（模糊） */}
            <DesktopWallpaper blur />

            {/* 主卡片 */}
            <div className="relative z-10 w-full max-w-lg mx-4">
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    {/* 进度条 */}
                    <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            {STEP_LABELS.map((label, index) => {
                                const stepNum = (index + 1) as Step;
                                const isActive = step === stepNum;
                                const isDone = step > stepNum;
                                return (
                                    <div key={label} className="flex items-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                                                    isDone
                                                        ? 'bg-green-500 text-white'
                                                        : isActive
                                                          ? 'bg-blue-600 text-white'
                                                          : 'bg-gray-100 text-gray-400'
                                                }`}
                                            >
                                                {isDone ? (
                                                    <svg className="w-4 h-4" viewBox="0 0 12 12" fill="none">
                                                        <path
                                                            d="M2 6l3 3 5-5"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                ) : (
                                                    stepNum
                                                )}
                                            </div>
                                            <span
                                                className={`text-xs ${
                                                    isActive
                                                        ? 'text-blue-600 font-medium'
                                                        : isDone
                                                          ? 'text-green-600'
                                                          : 'text-gray-400'
                                                }`}
                                            >
                                                {label}
                                            </span>
                                        </div>
                                        {/* 连接线 */}
                                        {index < STEP_LABELS.length - 1 && (
                                            <div
                                                className={`h-0.5 w-12 mx-2 mb-5 transition-colors duration-200 ${
                                                    isDone ? 'bg-green-400' : 'bg-gray-200'
                                                }`}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 步骤内容 */}
                    <div className="p-6">
                        {step === 1 && <StepWelcome onNext={() => setStep(2)} onSkip={handleSkip} />}
                        {step === 2 && <StepProvider onNext={handleProviderCreated} />}
                        {step === 3 && (
                            <StepModels
                                providerId={wizardData.providerId}
                                providerType={wizardData.providerType}
                                onNext={handleModelsCreated}
                            />
                        )}
                        {step === 4 && <StepComplete onFinish={handleFinish} />}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SetupWizard;
