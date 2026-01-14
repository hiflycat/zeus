package casbin

import (
	"sync"

	"github.com/casbin/casbin/v2"
	"github.com/casbin/casbin/v2/model"
	gormadapter "github.com/casbin/gorm-adapter/v3"
	"gorm.io/gorm"
)

// RBAC 模型配置
const rbacModel = `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && keyMatch2(r.obj, p.obj) && r.act == p.act
`

var (
	enforcer *casbin.Enforcer
	once     sync.Once
)

// Init 初始化 Casbin Enforcer
func Init(db *gorm.DB) error {
	var err error
	once.Do(func() {
		adapter, adapterErr := gormadapter.NewAdapterByDB(db)
		if adapterErr != nil {
			err = adapterErr
			return
		}

		m, modelErr := model.NewModelFromString(rbacModel)
		if modelErr != nil {
			err = modelErr
			return
		}

		enforcer, err = casbin.NewEnforcer(m, adapter)
		if err != nil {
			return
		}
		err = enforcer.LoadPolicy()
	})
	return err
}

// GetEnforcer 获取 Casbin Enforcer 实例
func GetEnforcer() *casbin.Enforcer {
	return enforcer
}

// ReloadPolicy 重新加载策略
func ReloadPolicy() error {
	if enforcer == nil {
		return nil
	}
	return enforcer.LoadPolicy()
}
