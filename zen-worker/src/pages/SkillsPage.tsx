/**
 * SkillsPage - Skills 管理页面
 */

import { useState } from 'react';
import { useChat } from '@langgraph-js/sdk/react';
import { useSkills } from '@codegraph/union-client';
import { useSettings } from '@codegraph/union-client';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

export function SkillsPage() {
  const { tools } = useChat();
  const { manager } = useSettings(); // MODIFIED: 从 SettingsContext 获取 manager
  const { skills, loading, error, getSkill, deleteSkill } = useSkills(manager);

  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [skillContent, setSkillContent] = useState<any>(null);

  const handleViewSkill = async (name: string) => {
    const content = await getSkill(name);
    if (content) {
      setSkillContent(content);
      setSelectedSkill(name);
      setIsViewModalOpen(true);
    }
  };

  const handleDeleteSkill = async (name: string) => {
    if (confirm(`确定要删除 Skill "${name}" 吗？`)) {
      try {
        await deleteSkill(name);
      } catch (err) {
        alert('删除失败: ' + (err as Error).message);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载 Skills 中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">加载失败: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Skills 管理</h2>
          <p className="text-gray-600 mt-1">管理和编辑 AI Skills</p>
        </div>
      </div>

      {/* 当前加载的工具 */}
      {tools.length > 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">当前加载的工具 ({tools.length})</h3>
          <div className="flex flex-wrap gap-2">
            {tools.map((tool: any, index: number) => (
              <span
                key={index}
                className="bg-white border border-blue-300 rounded px-2 py-1 text-sm text-blue-700"
              >
                {tool.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Skills 列表 */}
      {skills.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">暂无 Skills</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <div
              key={skill.name}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{skill.name}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {skill.description || '无描述'}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleViewSkill(skill.name)}
                  className="flex-1"
                >
                  查看
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDeleteSkill(skill.name)}
                >
                  删除
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 查看 Skill Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={selectedSkill || 'Skill 详情'}
        size="lg"
      >
        {skillContent && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Frontmatter</h3>
              <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto">
                {JSON.stringify(skillContent.frontmatter, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">内容</h3>
              <div className="bg-gray-50 p-3 rounded max-h-96 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap">{skillContent.markdown}</pre>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
