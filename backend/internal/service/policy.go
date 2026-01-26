package service

import (
	"strconv"

	casbinPkg "backend/internal/casbin"
	"backend/internal/model"
	"backend/internal/global"
)

// Policy 策略结构
type Policy struct {
	Role   string `json:"role"`
	Path   string `json:"path"`
	Method string `json:"method"`
}

// PolicyService Casbin 策略服务
type PolicyService struct{}

// NewPolicyService 创建策略服务
func NewPolicyService() *PolicyService {
	return &PolicyService{}
}

// GetRolePolicies 获取角色的策略列表
func (s *PolicyService) GetRolePolicies(roleID uint) ([]Policy, error) {
	enforcer := casbinPkg.GetEnforcer()
	if enforcer == nil {
		return []Policy{}, nil
	}

	roleIDStr := strconv.FormatUint(uint64(roleID), 10)
	rules, _ := enforcer.GetFilteredPolicy(0, roleIDStr)
	policies := make([]Policy, 0, len(rules))
	for _, rule := range rules {
		if len(rule) >= 3 {
			policies = append(policies, Policy{
				Role:   rule[0],
				Path:   rule[1],
				Method: rule[2],
			})
		}
	}
	return policies, nil
}

// UpdateRolePolicies 更新角色的策略（批量替换）
func (s *PolicyService) UpdateRolePolicies(roleID uint, apiDefIDs []uint) error {
	enforcer := casbinPkg.GetEnforcer()
	if enforcer == nil {
		return nil
	}

	roleIDStr := strconv.FormatUint(uint64(roleID), 10)

	// 删除该角色的所有旧策略
	enforcer.RemoveFilteredPolicy(0, roleIDStr)

	// 获取选中的 API 定义
	var apiDefs []model.APIDefinition
	if len(apiDefIDs) > 0 {
		if err := global.GetDB().Where("id IN ?", apiDefIDs).Find(&apiDefs).Error; err != nil {
			return err
		}
	}

	// 添加新策略
	for _, apiDef := range apiDefs {
		_, err := enforcer.AddPolicy(roleIDStr, apiDef.Path, apiDef.Method)
		if err != nil {
			return err
		}
	}

	return enforcer.SavePolicy()
}

// GetRoleAPIDefIDs 获取角色已分配的 API 定义 ID 列表
func (s *PolicyService) GetRoleAPIDefIDs(roleID uint) ([]uint, error) {
	enforcer := casbinPkg.GetEnforcer()
	if enforcer == nil {
		return []uint{}, nil
	}

	roleIDStr := strconv.FormatUint(uint64(roleID), 10)
	rules, _ := enforcer.GetFilteredPolicy(0, roleIDStr)
	ids := make([]uint, 0)

	for _, rule := range rules {
		if len(rule) >= 3 {
			var apiDef model.APIDefinition
			if err := global.GetDB().Where("path = ? AND method = ?", rule[1], rule[2]).First(&apiDef).Error; err == nil {
				ids = append(ids, apiDef.ID)
			}
		}
	}
	return ids, nil
}
