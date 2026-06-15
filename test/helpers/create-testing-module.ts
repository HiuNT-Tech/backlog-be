import { Test } from '@nestjs/testing';
import { Type, Provider } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';

/**
 * Tạo instance của `target` với mọi dependency được mock bằng jest-mock-extended.
 * Trả về service thật + map các mock để assert/stub.
 */
export async function createServiceWithMocks<T>(
  target: Type<T>,
  deps: Type<unknown>[],
): Promise<{ service: T; mocks: Map<Type<unknown>, MockProxy<unknown>> }> {
  const mocks = new Map<Type<unknown>, MockProxy<unknown>>();
  const providers: Provider[] = deps.map((dep) => {
    const mocked = mock();
    mocks.set(dep, mocked);
    return { provide: dep, useValue: mocked };
  });

  const moduleRef = await Test.createTestingModule({
    providers: [target, ...providers],
  }).compile();

  return { service: moduleRef.get(target), mocks };
}
