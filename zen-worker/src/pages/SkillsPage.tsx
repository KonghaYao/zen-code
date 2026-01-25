/**
 * SkillsPage - Skills 管理页面
 */

import { useState } from 'react';
import { useChat } from '@langgraph-js/sdk/react';
import { useSkills } from '@codegraph/union-client';
import { useSettings } from '@codegraph/union-client';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

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
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">当前加载的工具 ({tools.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tools.map((tool: any, index: number) => (
                <Badge key={index} variant="secondary" className="bg-white text-blue-700 border-blue-300">
                  {tool.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills 列表 */}
      {skills.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">暂无 Skills</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <Card key={skill.name} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base">{skill.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {skill.description || '无描述'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
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
                    variant="destructive"
                    onClick={() => handleDeleteSkill(skill.name)}
                  >
                    删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 查看 Skill Dialog */}
      <Dialog open={isViewModalOpen} onOpenChange={(open) => setIsViewModalOpen(open)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedSkill || 'Skill 详情'}</DialogTitle>
          </DialogHeader>
          {skillContent && (
            <div className="flex-1 overflow-y-auto space-y-4">
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
