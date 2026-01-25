/**
 * Global Approval Panel Type Definitions
 *
 * 全局审批面板的类型定义，包括审批请求状态、数据结构和接口
 */

/**
 * 审批状态
 */
export enum ApprovalStatus {
  Pending = 'pending',
  Approved = 'approved',
  Edited = 'edited',
  Rejected = 'rejected',
}

/**
 * 审批请求数据结构
 */
export interface ApprovalRequest {
  /** 唯一标识符 */
  id: string;
  /** 工具调用信息 */
  toolCall: {
    name: string;
    args: any;
  };
  /** 工具对象引用（用于执行 sendResumeData） */
  tool?: any;
  /** 审批状态 */
  status: ApprovalStatus;
  /** 编辑后的参数（仅当 status 为 Edited 时有值） */
  editedArgs?: any;
  /** 创建时间 */
  createdAt: Date;
  /** 消息索引（可选） */
  messageIndex?: number;
  /** 描述信息（可选） */
  description?: string;
}

/**
 * 审批回调接口
 */
export interface ApprovalCallbacks {
  /** 审批通过 */
  onApprove: (request: ApprovalRequest) => void;
  /** 审批编辑 */
  onEdit: (request: ApprovalRequest, editedArgs: any) => void;
  /** 审批拒绝 */
  onReject: (request: ApprovalRequest) => void;
}
