import { shallowMount } from '@vue/test-utils';
import PasswordInput from '@/components/PasswordInput.vue';

describe('PasswordInput.vue', () => {
  it('renders props.placeholder when passed', () => {
    const placeholder = 'Enter password';
    const wrapper = shallowMount(PasswordInput, {
      propsData: { placeholder },
    });
    expect(wrapper.find('input').attributes('placeholder')).toBe(placeholder);
  });
});
